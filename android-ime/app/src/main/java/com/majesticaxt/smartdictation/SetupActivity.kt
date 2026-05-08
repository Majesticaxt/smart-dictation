package com.majesticaxt.smartdictation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class SetupActivity : AppCompatActivity() {

    private val PWA_URL = "https://smart-dictation-gamma.vercel.app/"
    private val PREFS_NAME = "smart_dictation_prefs"
    private val KEY_SETUP_DONE = "setup_complete"

    private var wasInSettings = false

    private val requestMic = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            saveSetupState()
            // If keyboard is already enabled, go straight to home
            if (isKeyboardEnabled()) {
                showHome()
            }
        }
        updateUI()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        // If everything is already set up, skip straight to home
        if (isFullyConfigured()) {
            showHome()
            return
        }

        findViewById<Button>(R.id.btn_grant_mic).setOnClickListener {
            requestMic.launch(Manifest.permission.RECORD_AUDIO)
        }
        findViewById<Button>(R.id.btn_enable_keyboard).setOnClickListener {
            wasInSettings = true
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_open_website).setOnClickListener {
            showWebView()
        }

        // Home screen buttons
        findViewById<Button>(R.id.btn_home_dashboard).setOnClickListener {
            showWebView()
        }
        findViewById<Button>(R.id.btn_home_settings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }

        updateUI()
    }

    override fun onResume() {
        super.onResume()
        // When returning from keyboard settings, check if now fully configured
        if (wasInSettings) {
            wasInSettings = false
            if (isFullyConfigured()) {
                saveSetupState()
                showHome()
                return
            }
        }
        // Also check on every resume in case state changed
        if (isFullyConfigured()) {
            showHome()
            return
        }
        updateUI()
    }

    private fun isFullyConfigured(): Boolean {
        val hasMic = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        val hasKeyboard = isKeyboardEnabled()

        // If both are granted, save and return true
        if (hasMic && hasKeyboard) {
            saveSetupState()
            return true
        }

        // If we previously saved as complete but keyboard was disabled, still show home
        // (the keyboard check can be unreliable on some devices)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_SETUP_DONE, false) && hasMic) {
            return true
        }

        return false
    }

    private fun isKeyboardEnabled(): Boolean {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        val enabledList = imm.enabledInputMethodList
        return enabledList.any { it.packageName == packageName }
    }

    private fun saveSetupState() {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_SETUP_DONE, true)
            .apply()
    }

    private fun showHome() {
        val setupLayout = findViewById<LinearLayout>(R.id.setup_layout)
        val homeLayout = findViewById<LinearLayout>(R.id.home_layout)
        val webView = findViewById<WebView>(R.id.webview)

        setupLayout.visibility = View.GONE
        homeLayout.visibility = View.VISIBLE
        webView.visibility = View.GONE
    }

    private fun showWebView() {
        val setupLayout = findViewById<LinearLayout>(R.id.setup_layout)
        val homeLayout = findViewById<LinearLayout>(R.id.home_layout)
        val webView = findViewById<WebView>(R.id.webview)

        setupLayout.visibility = View.GONE
        homeLayout.visibility = View.GONE
        webView.visibility = View.VISIBLE

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
        }

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let { runOnUiThread { it.grant(it.resources) } }
            }
        }

        webView.loadUrl(PWA_URL)
    }

    override fun onBackPressed() {
        val webView = findViewById<WebView>(R.id.webview)

        if (webView.visibility == View.VISIBLE) {
            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                webView.visibility = View.GONE
                if (isFullyConfigured()) showHome() else updateUI()
            }
        } else {
            super.onBackPressed()
        }
    }

    private fun updateUI() {
        val hasMic = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        val setupLayout = findViewById<LinearLayout>(R.id.setup_layout)
        val homeLayout = findViewById<LinearLayout>(R.id.home_layout)
        val webView = findViewById<WebView>(R.id.webview)

        setupLayout.visibility = View.VISIBLE
        homeLayout.visibility = View.GONE
        webView.visibility = View.GONE

        val tvStep = findViewById<TextView>(R.id.tv_step)
        val btnMic = findViewById<Button>(R.id.btn_grant_mic)
        val btnKb  = findViewById<Button>(R.id.btn_enable_keyboard)
        val btnWeb = findViewById<Button>(R.id.btn_open_website)

        if (!hasMic) {
            tvStep.text = "Step 1 of 2: Grant microphone permission"
            btnMic.isEnabled = true
            btnKb.isEnabled  = false
            btnWeb.isEnabled = false
        } else {
            tvStep.text = "✅ Mic granted!\n\nStep 2: Enable Smart Dictation keyboard\nTap below → find Smart Dictation → toggle ON"
            btnMic.isEnabled = false
            btnKb.isEnabled  = true
            btnWeb.isEnabled = true
        }
    }
}
