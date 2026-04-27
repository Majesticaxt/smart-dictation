package com.majesticaxt.smartdictation

import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class DictationIME : InputMethodService(), RecognitionListener {

    // ── State ──────────────────────────────────────────────────────────────
    private enum class State { IDLE, LISTENING, HAS_TEXT, CLEANING }

    private var state = State.IDLE
    private var currentText = ""
    private var isListening = false

    // ── Views ──────────────────────────────────────────────────────────────
    private var tvPreview: TextView? = null
    private var tvStatus: TextView? = null
    private var btnMic: ImageButton? = null
    private var btnInsert: Button? = null
    private var btnClean: Button? = null
    private var btnClear: Button? = null
    private var btnDelete: Button? = null
    private var btnSwitch: Button? = null

    // ── Resources ──────────────────────────────────────────────────────────
    private var speechRecognizer: SpeechRecognizer? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val recentTranscripts = mutableMapOf<String, Long>()

    companion object {
        private val GROQ_API_KEY: String = BuildConfig.GROQ_API_KEY
        private const val GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
        private const val DEDUP_MS = 3000L
    }

    // ── IME Lifecycle ──────────────────────────────────────────────────────

    override fun onCreateInputView(): View {
        val view = LayoutInflater.from(this).inflate(R.layout.keyboard_view, null)

        tvPreview = view.findViewById(R.id.tv_preview)
        tvStatus  = view.findViewById(R.id.tv_status)
        btnMic    = view.findViewById(R.id.btn_mic)
        btnInsert = view.findViewById(R.id.btn_insert)
        btnClean  = view.findViewById(R.id.btn_clean)
        btnClear  = view.findViewById(R.id.btn_clear)
        btnDelete = view.findViewById(R.id.btn_delete)
        btnSwitch = view.findViewById(R.id.btn_switch)

        initSpeechRecognizer()
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
        speechRecognizer?.destroy()
        scope.cancel()
    }

    // ── Speech recognizer ──────────────────────────────────────────────────

    private fun initSpeechRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            setStatus("⚠️ Speech recognition unavailable")
            return
        }
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(this)
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
        speechRecognizer?.startListening(buildRecognizerIntent())
        applyState(State.LISTENING)
    }

    private fun stopListening() {
        isListening = false
        speechRecognizer?.stopListening()
        applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
    }

    // ── Button logic ───────────────────────────────────────────────────────

    private fun setupClickListeners() {
        btnMic?.setOnClickListener {
            if (isListening) stopListening() else startListening()
        }
        btnInsert?.setOnClickListener {
            currentInputConnection?.commitText(currentText, 1)
            reset()
        }
        btnClean?.setOnClickListener {
            if (currentText.isNotBlank()) cleanWithGroq(currentText)
        }
        btnClear?.setOnClickListener { reset() }
        btnDelete?.setOnClickListener {
            currentInputConnection?.deleteSurroundingText(1, 0)
        }
        btnSwitch?.setOnClickListener { switchToPreviousInputMethod() }
    }

    private fun reset() {
        currentText = ""
        tvPreview?.text = ""
        applyState(State.IDLE)
    }

    // ── Groq AI cleanup ────────────────────────────────────────────────────

    private fun cleanWithGroq(text: String) {
        applyState(State.CLEANING)
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                try { groqClean(text) } catch (e: Exception) { localClean(text) }
            }
            currentText = result
            tvPreview?.text = result
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
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
            State.LISTENING -> {
                setStatus("🔴 Listening… tap mic to stop")
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
            State.HAS_TEXT -> {
                setStatus("✅ Ready — tap Insert to type into the app")
                btnInsert?.isEnabled = true
                btnClean?.isEnabled  = true
            }
            State.CLEANING -> {
                setStatus("✨ Cleaning with AI…")
                btnInsert?.isEnabled = false
                btnClean?.isEnabled  = false
            }
        }
    }

    private fun setStatus(msg: String) { tvStatus?.text = msg }

    // ── RecognitionListener ────────────────────────────────────────────────

    override fun onReadyForSpeech(params: Bundle?) = setStatus("🔴 Listening…")
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    override fun onPartialResults(partialResults: Bundle?) {
        val partial = partialResults
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull() ?: return
        tvPreview?.text = if (currentText.isBlank()) "[$partial]"
                          else "$currentText [$partial]"
    }

    override fun onResults(results: Bundle?) {
        val result = results
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()?.trim() ?: return

        // Deduplication — prevent Android from repeating the same result
        val now = System.currentTimeMillis()
        val key = result.lowercase()
        val lastSeen = recentTranscripts[key]
        if (lastSeen != null && now - lastSeen < DEDUP_MS) return
        recentTranscripts[key] = now
        recentTranscripts.entries.removeIf { now - it.value > DEDUP_MS }

        currentText += (if (currentText.isBlank()) "" else " ") + result
        tvPreview?.text = currentText

        // Auto-restart while still in listening mode
        if (isListening) {
            speechRecognizer?.startListening(buildRecognizerIntent())
        } else {
            applyState(State.HAS_TEXT)
        }
    }

    override fun onEndOfSpeech() {
        if (!isListening) applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
    }

    override fun onError(error: Int) {
        // Timeout / no match — just restart if still listening
        if (error == SpeechRecognizer.ERROR_NO_MATCH ||
            error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
            if (isListening) {
                speechRecognizer?.startListening(buildRecognizerIntent())
                return
            }
        }
        isListening = false
        setStatus("Error ${errorString(error)}")
        applyState(if (currentText.isNotBlank()) State.HAS_TEXT else State.IDLE)
    }

    private fun errorString(code: Int) = when (code) {
        SpeechRecognizer.ERROR_AUDIO                  -> "audio recording"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "microphone permission denied"
        SpeechRecognizer.ERROR_NETWORK                -> "network"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT        -> "network timeout"
        SpeechRecognizer.ERROR_SERVER                 -> "server"
        else                                          -> "($code)"
    }
}
