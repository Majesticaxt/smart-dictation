package com.majesticaxt.smartdictation

import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class DictationIME : InputMethodService() {

    // ── State ──────────────────────────────────────────────────────────────
    private enum class State { IDLE, LISTENING, HAS_TEXT, CLEANING }

    private var state = State.IDLE
    private var currentText = ""
    private var isListening = false
    private var recognizerGeneration = 0  // prevents stale callbacks

    // ── Views ──────────────────────────────────────────────────────────────
    private var etPreview: EditText? = null
    private var tvStatus: TextView? = null
    private var btnMic: ImageButton? = null
    private var btnInsert: Button? = null
    private var btnClean: Button? = null
    private var btnClear: Button? = null
    private var btnDeleteWord: Button? = null
    private var btnSwitch: Button? = null
    private var btnUndo: Button? = null

    // ── Resources ──────────────────────────────────────────────────────────
    private var speechRecognizer: SpeechRecognizer? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val recentTranscripts = mutableMapOf<String, Long>()

    companion object {
        private val GROQ_API_KEY: String = BuildConfig.GROQ_API_KEY
        private const val GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
        private const val DEDUP_MS = 4000L
    }

    // ── Punctuation & Voice Commands ───────────────────────────────────────
    private val punctuationMap = mapOf(
        "comma" to ",", "period" to ".", "full stop" to ".", "dot" to ".",
        "question mark" to "?", "exclamation mark" to "!", "exclamation point" to "!",
        "colon" to ":", "semicolon" to ";",
        "open quote" to "\"", "close quote" to "\"",
        "open parenthesis" to "(", "close parenthesis" to ")",
        "dash" to "-", "hyphen" to "-", "ellipsis" to "...",
        "at sign" to "@", "hashtag" to "#", "ampersand" to "&", "apostrophe" to "'",
        "new line" to "\n", "new paragraph" to "\n\n"
    )

    private val voiceCommands = mapOf(
        "scratch that" to "DELETE_LAST_SENTENCE", "delete that" to "DELETE_LAST_SENTENCE",
        "remove that" to "DELETE_LAST_SENTENCE",
        "delete last word" to "DELETE_LAST_WORD", "remove last word" to "DELETE_LAST_WORD",
        "backspace" to "DELETE_LAST_WORD",
        "undo" to "DELETE_LAST_CHUNK", "undo that" to "DELETE_LAST_CHUNK",
        "go back" to "DELETE_LAST_CHUNK",
        "clear all" to "CLEAR_ALL", "clear everything" to "CLEAR_ALL",
        "start over" to "CLEAR_ALL"
    )

    // ── IME Lifecycle ──────────────────────────────────────────────────────

    override fun onCreateInputView(): View {
        val view = LayoutInflater.from(this).inflate(R.layout.keyboard_view, null)

        etPreview     = view.findViewById(R.id.et_preview)
        tvStatus      = view.findViewById(R.id.tv_status)
        btnMic        = view.findViewById(R.id.btn_mic)
        btnInsert     = view.findViewById(R.id.btn_insert)
        btnClean      = view.findViewById(R.id.btn_clean)
        btnClear      = view.findViewById(R.id.btn_clear)
        btnDeleteWord = view.findViewById(R.id.btn_delete_word)
        btnSwitch     = view.findViewById(R.id.btn_switch)
        btnUndo       = view.findViewById(R.id.btn_undo)

        // Sync EditText → currentText
        etPreview?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                currentText = s?.toString() ?: ""
                updateButtonStates()
            }
        })

        setupClickListeners()
        applyState(State.IDLE)
        return view
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        if (isListening) stopListening()
    }

    override fun onDestroy() {
        super.onDestroy()
        destroyRecognizer()
        scope.cancel()
    }

    // ── Speech recognizer — fresh instance every time ──────────────────────

    private fun destroyRecognizer() {
        try { speechRecognizer?.destroy() } catch (_: Exception) {}
        speechRecognizer = null
    }

    private fun createFreshRecognizer(gen: Int) {
        destroyRecognizer()

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            setStatus("⚠️ Speech recognition unavailable")
            return
        }

        val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        val listener = object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                if (gen != recognizerGeneration) return
                setStatus("🔴 Listening…")
            }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                if (gen != recognizerGeneration) return
                val partial = partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull() ?: return
                // Show partials in the STATUS BAR only — never write to EditText
                setStatus("🎤 $partial")
            }

            override fun onResults(results: Bundle?) {
                if (gen != recognizerGeneration) return
                val result = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.trim() ?: return

                // Deduplication
                val now = System.currentTimeMillis()
                val key = result.lowercase().replace("\\s+".toRegex(), " ")
                val lastSeen = recentTranscripts[key]
                if (lastSeen != null && now - lastSeen < DEDUP_MS) return
                recentTranscripts[key] = now
                recentTranscripts.entries.removeIf { now - it.value > DEDUP_MS + 1000 }

                // Process voice commands and punctuation
                val processed = processTranscript(result)
                if (processed != null) {
                    currentText += (if (currentText.isBlank()) "" else " ") + processed
                    etPreview?.setText(currentText)
                    etPreview?.setSelection(currentText.length)
                }

                // Auto-restart with a FRESH instance
                if (isListening) {
                    val nextGen = ++recognizerGeneration
                    createFreshRecognizer(nextGen)
                    speechRecognizer?.startListening(buildRecognizerIntent())
                } else {
                    applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
                }
            }

            override fun onEndOfSpeech() {
                if (gen != recognizerGeneration) return
                if (!isListening) {
                    applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
                }
            }

            override fun onError(error: Int) {
                if (gen != recognizerGeneration) return
                if ((error == SpeechRecognizer.ERROR_NO_MATCH ||
                     error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) && isListening) {
                    // Restart with fresh instance
                    val nextGen = ++recognizerGeneration
                    createFreshRecognizer(nextGen)
                    speechRecognizer?.startListening(buildRecognizerIntent())
                    return
                }
                isListening = false
                setStatus("Error ${errorString(error)}")
                applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
            }
        }

        recognizer.setRecognitionListener(listener)
        speechRecognizer = recognizer
    }

    private fun buildRecognizerIntent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    }

    private fun startListening() {
        if (isListening) return
        isListening = true
        recentTranscripts.clear()
        val gen = ++recognizerGeneration
        createFreshRecognizer(gen)
        speechRecognizer?.startListening(buildRecognizerIntent())
        applyState(State.LISTENING)
    }

    private fun stopListening() {
        isListening = false
        recognizerGeneration++  // invalidate any pending callbacks
        try { speechRecognizer?.stopListening() } catch (_: Exception) {}
        applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
    }

    // ── Voice command & punctuation processing ─────────────────────────────

    private fun processTranscript(raw: String): String? {
        val lower = raw.trim().lowercase()

        // Check voice commands (longest match first)
        for (cmd in voiceCommands.keys.sortedByDescending { it.length }) {
            if (lower == cmd || lower.startsWith("$cmd ") || lower.endsWith(" $cmd")) {
                executeVoiceCommand(voiceCommands[cmd]!!)
                return null
            }
        }

        // Process punctuation
        var result = raw.trim()
        for (spoken in punctuationMap.keys.sortedByDescending { it.length }) {
            val regex = "\\b${Regex.escape(spoken)}\\b".toRegex(RegexOption.IGNORE_CASE)
            result = regex.replace(result) { punctuationMap[spoken]!! }
        }

        // Clean spaces before punctuation, ensure space after
        result = result.replace("\\s+([,\\.\\?!:;])".toRegex(), "$1")
        result = result.replace("([,\\.\\?!:;])([A-Za-z])".toRegex(), "$1 $2")

        return result
    }

    private fun executeVoiceCommand(action: String) {
        when (action) {
            "DELETE_LAST_SENTENCE" -> {
                val match = "^([\\s\\S]*[.?!])\\s*[^.?!]*$".toRegex().find(currentText)
                currentText = match?.groupValues?.get(1)?.trim() ?: ""
                setStatus("🗑️ Deleted last phrase")
            }
            "DELETE_LAST_WORD" -> {
                currentText = currentText.replace("\\s*\\S+\\s*$".toRegex(), "")
                setStatus("🗑️ Deleted last word")
            }
            "DELETE_LAST_CHUNK" -> {
                val words = currentText.trimEnd().split("\\s+".toRegex())
                currentText = words.take(maxOf(0, words.size - 5)).joinToString(" ")
                setStatus("↩️ Undid last chunk")
            }
            "CLEAR_ALL" -> {
                currentText = ""
                setStatus("🗑️ Cleared all text")
            }
        }
        etPreview?.setText(currentText)
        if (currentText.isNotEmpty()) etPreview?.setSelection(currentText.length)
        applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
    }

    // ── Button logic ───────────────────────────────────────────────────────

    private fun setupClickListeners() {
        btnMic?.setOnClickListener {
            if (isListening) stopListening() else startListening()
        }
        btnInsert?.setOnClickListener {
            val text = etPreview?.text?.toString() ?: currentText
            currentInputConnection?.commitText(text, 1)
            reset()
        }
        btnClean?.setOnClickListener {
            val text = etPreview?.text?.toString() ?: currentText
            if (text.isNotBlank()) cleanWithGroq(text)
        }
        btnClear?.setOnClickListener { reset() }
        btnDeleteWord?.setOnClickListener {
            currentText = currentText.replace("\\s*\\S+\\s*$".toRegex(), "")
            etPreview?.setText(currentText)
            if (currentText.isNotEmpty()) etPreview?.setSelection(currentText.length)
            applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
        }
        btnUndo?.setOnClickListener { executeVoiceCommand("DELETE_LAST_CHUNK") }
        btnSwitch?.setOnClickListener { switchToPreviousInputMethod() }
    }

    private fun reset() {
        currentText = ""
        etPreview?.setText("")
        applyState(State.IDLE)
    }

    private fun updateButtonStates() {
        val hasText = currentText.isNotBlank()
        btnInsert?.isEnabled = hasText && state != State.CLEANING
        btnClean?.isEnabled = hasText && state != State.CLEANING
    }

    // ── Groq AI cleanup ────────────────────────────────────────────────────

    private fun cleanWithGroq(text: String) {
        applyState(State.CLEANING)
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                try { groqClean(text) } catch (e: Exception) { localClean(text) }
            }
            currentText = result
            etPreview?.setText(result)
            etPreview?.setSelection(result.length)
            applyState(State.HAS_TEXT)
        }
    }

    private fun groqClean(text: String): String {
        val client = OkHttpClient.Builder()
            .callTimeout(20, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        val body = JSONObject().apply {
            put("model", "llama-3.1-8b-instant")
            put("temperature", 0.2)
            put("max_tokens", 512)
            put("messages", JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "system")
                    put("content", "Clean up dictated speech: fix grammar, add punctuation, remove fillers (um, uh, like, you know, basically). Output ONLY the cleaned text, nothing else.")
                })
                put(JSONObject().apply { put("role", "user"); put("content", text) })
            })
        }.toString().toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(GROQ_URL)
            .addHeader("Authorization", "Bearer $GROQ_API_KEY")
            .post(body)
            .build()

        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw IOException("HTTP ${response.code}")

        return JSONObject(response.body!!.string())
            .getJSONArray("choices")
            .getJSONObject(0)
            .getJSONObject("message")
            .getString("content")
            .trim()
    }

    private fun localClean(text: String): String {
        val fillers = listOf("um,?", "uh,?", "like,?", "you know,?", "basically,?", "literally,?", "I mean,?")
        var r = text
        fillers.forEach { r = r.replace("\\b${it}\\b".toRegex(RegexOption.IGNORE_CASE), "") }
        r = r.replace("\\s{2,}".toRegex(), " ").trim()
        return r.replaceFirstChar { it.uppercase() }
    }

    // ── UI state ───────────────────────────────────────────────────────────

    private fun applyState(s: State) {
        state = s
        when (s) {
            State.IDLE -> {
                setStatus("Tap mic to speak")
                btnMic?.setBackgroundColor(0xFF312e81.toInt())
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
            State.LISTENING -> {
                setStatus("🔴 Listening… tap mic to stop")
                btnMic?.setBackgroundColor(0xFF991b1b.toInt())
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
            State.HAS_TEXT -> {
                setStatus("✅ Edit text, then tap Insert or Clean")
                btnMic?.setBackgroundColor(0xFF312e81.toInt())
                btnInsert?.isEnabled = true
                btnClean?.isEnabled  = true
            }
            State.CLEANING -> {
                setStatus("✨ Cleaning with AI…")
                btnMic?.setBackgroundColor(0xFF312e81.toInt())
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
        }
    }

    private fun setStatus(msg: String) { tvStatus?.text = msg }

    private fun errorString(code: Int) = when (code) {
        SpeechRecognizer.ERROR_AUDIO                  -> "audio recording"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "microphone permission denied"
        SpeechRecognizer.ERROR_NETWORK                -> "network"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT        -> "network timeout"
        SpeechRecognizer.ERROR_SERVER                 -> "server"
        else                                          -> "($code)"
    }
}
