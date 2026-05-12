package com.majesticaxt.smartdictation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat

class SetupActivity : AppCompatActivity() {

    companion object {
        private const val PREFS = "smart_dictation_prefs"
        private const val KEY_SETUP_DONE = "setup_done_v2"
        private const val KEY_DICTATION_COUNT = "stat_dictations"
        private const val KEY_WORD_COUNT = "stat_words"
        private const val PWA_URL = "https://smart-dictation-gamma.vercel.app"
    }

    private val requestMic = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { refreshSetupUI() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        // ── Setup buttons ──
        findViewById<Button>(R.id.btn_grant_mic).setOnClickListener {
            requestMic.launch(Manifest.permission.RECORD_AUDIO)
        }
        findViewById<Button>(R.id.btn_enable_keyboard).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_finish_setup).setOnClickListener {
            val hasMic = ContextCompat.checkSelfPermission(
                this, Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
            val kbEnabled = isKeyboardEnabled()

            if (hasMic && kbEnabled) {
                // Setup fully complete → save and launch PWA dashboard
                prefs().edit().putBoolean(KEY_SETUP_DONE, true).apply()
                launchPWA()
            } else {
                // Setup incomplete → stay on setup screen
                prefs().edit().putBoolean(KEY_SETUP_DONE, false).apply()
                refreshSetupUI()
            }
        }

        // ── Dashboard buttons ──
        findViewById<Button>(R.id.btn_reconfigure).setOnClickListener {
            showSetup()
        }
        findViewById<Button>(R.id.btn_keyboard_settings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_switch_keyboard).setOnClickListener {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }
        // Open PWA from dashboard
        findViewById<Button>(R.id.btn_open_pwa)?.setOnClickListener {
            launchPWA()
        }

        // ── Decide which screen to show ──
        if (prefs().getBoolean(KEY_SETUP_DONE, false)) {
            showDashboard()
        } else {
            showSetup()
        }
    }

    override fun onResume() {
        super.onResume()
        // Refresh whichever screen is visible
        val setupVisible = findViewById<ScrollView>(R.id.setup_layout).visibility == View.VISIBLE
        if (setupVisible) {
            refreshSetupUI()
        } else {
            refreshDashboard()
        }
    }

    // ── Screen switching ──────────────────────────────────────────────────

    private fun showSetup() {
        findViewById<ScrollView>(R.id.setup_layout).visibility = View.VISIBLE
        findViewById<ScrollView>(R.id.dashboard_layout).visibility = View.GONE
        refreshSetupUI()
    }

    private fun showDashboard() {
        findViewById<ScrollView>(R.id.setup_layout).visibility = View.GONE
        findViewById<ScrollView>(R.id.dashboard_layout).visibility = View.VISIBLE
        refreshDashboard()
    }

    // ── Setup UI ──────────────────────────────────────────────────────────

    private fun refreshSetupUI() {
        val hasMic = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        val tvStep = findViewById<TextView>(R.id.tv_step)
        val btnMic = findViewById<Button>(R.id.btn_grant_mic)
        val btnKb  = findViewById<Button>(R.id.btn_enable_keyboard)
        val btnDone = findViewById<Button>(R.id.btn_finish_setup)

        if (!hasMic) {
            tvStep.text = "Step 1 of 2: Grant microphone permission\n\nTap the button below to allow microphone access."
            btnMic.isEnabled = true
            btnMic.alpha = 1f
            btnKb.isEnabled = false
            btnKb.alpha = 0.4f
            btnDone.isEnabled = false
            btnDone.alpha = 0.4f
        } else {
            val kbEnabled = isKeyboardEnabled()
            tvStep.text = if (kbEnabled) {
                "✅ All set!\n\nMicrophone: Granted\nKeyboard: Enabled\n\nTap 'Done' to continue!"
            } else {
                "✅ Mic granted!\n\nStep 2: Enable Smart Dictation keyboard\nTap below → find Smart Dictation → toggle ON"
            }
            btnMic.isEnabled = false
            btnMic.alpha = 0.4f
            btnKb.isEnabled = true
            btnKb.alpha = 1f
            // Allow "Done" even if keyboard check fails (unreliable on some devices)
            btnDone.isEnabled = true
            btnDone.alpha = 1f
        }
    }

    // ── Dashboard UI ──────────────────────────────────────────────────────

    private fun refreshDashboard() {
        val p = prefs()
        val dictations = p.getInt(KEY_DICTATION_COUNT, 0)
        val words = p.getInt(KEY_WORD_COUNT, 0)

        findViewById<TextView>(R.id.tv_stat_dictations).text = dictations.toString()
        findViewById<TextView>(R.id.tv_stat_words).text = words.toString()

        val statusBadge = findViewById<TextView>(R.id.tv_status_badge)
        if (isKeyboardEnabled()) {
            statusBadge.text = "✅ Keyboard Active"
            statusBadge.setTextColor(0xFF86efac.toInt())
        } else {
            statusBadge.text = "⚠️ Keyboard not enabled"
            statusBadge.setTextColor(0xFFfca5a5.toInt())
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private fun prefs() = getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun isKeyboardEnabled(): Boolean {
        return try {
            val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
            imm.enabledInputMethodList.any { it.packageName == packageName }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Launch PWA dashboard in a Chrome Custom Tab.
     * Looks native — no browser chrome, uses our theme color.
     * Only called after setup is fully complete.
     */
    private fun launchPWA() {
        try {
            val colorParams = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(0xFF0d0d1a.toInt())
                .setNavigationBarColor(0xFF0d0d1a.toInt())
                .build()
            val intent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colorParams)
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .setShowTitle(false)
                .build()
            intent.launchUrl(this, Uri.parse(PWA_URL))
        } catch (e: Exception) {
            // Fallback: open in default browser
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PWA_URL)))
        }
    }
}
