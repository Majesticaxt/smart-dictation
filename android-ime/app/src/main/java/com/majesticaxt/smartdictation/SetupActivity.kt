package com.majesticaxt.smartdictation

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class SetupActivity : AppCompatActivity() {

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
            val url = "https://smart-dictation.vercel.app"
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
        updateUI()
    }

    override fun onResume() { super.onResume(); updateUI() }

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
