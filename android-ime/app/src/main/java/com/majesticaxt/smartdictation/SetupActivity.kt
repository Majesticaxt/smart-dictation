package com.majesticaxt.smartdictation

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.View
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

    private val requestMic = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { updateUI() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        findViewById<Button>(R.id.btn_grant_mic).setOnClickListener {
            requestMic.launch(Manifest.permission.RECORD_AUDIO)
        }
        findViewById<Button>(R.id.btn_enable_keyboard).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }
        findViewById<Button>(R.id.btn_open_website).setOnClickListener {
            // Show the WebView with the PWA
            showWebView()
        }
        updateUI()
    }

    override fun onResume() { super.onResume(); updateUI() }

    private fun showWebView() {
        val setupLayout = findViewById<LinearLayout>(R.id.setup_layout)
        val webView = findViewById<WebView>(R.id.webview)

        setupLayout.visibility = View.GONE
        webView.visibility = View.VISIBLE

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.loadUrl(PWA_URL)
    }

    override fun onBackPressed() {
        val webView = findViewById<WebView>(R.id.webview)
        val setupLayout = findViewById<LinearLayout>(R.id.setup_layout)

        if (webView.visibility == View.VISIBLE) {
            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                webView.visibility = View.GONE
                setupLayout.visibility = View.VISIBLE
            }
        } else {
            super.onBackPressed()
        }
    }

    private fun updateUI() {
        val hasMic = ContextCompat.checkSelfPermission(
            this, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

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
            tvStep.text = "✅ Mic granted!\n\nStep 2: Enable Smart Dictation keyboard\nTap below → find Smart Dictation → toggle ON\n\nThen open any app and switch to Smart Dictation keyboard!"
            btnMic.isEnabled = false
            btnKb.isEnabled  = true
            btnWeb.isEnabled = true
        }
    }
}
