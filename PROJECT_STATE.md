# Smart Dictation Project - State & Setup Guide

This document preserves the current state of the Smart Dictation project so you can resume work seamlessly without starting over.

## 📁 Project Components

1. **Web App / PWA (`client/` and `server/`)**
   - **Status**: Fully functional and deployed.
   - **Tech**: React, Vite, Tailwind CSS, Express, Node.js.
   - **Features**: Speech-to-text, AI cleanup using Groq API (`llama-3.1-8b-instant`), voice commands ("scratch that", "delete last word"), offline fallback.
   - **Bug Fixes Applied**: Fixed the Android Web Speech API bug where text would duplicate or triple by implementing a fresh instance restart and a 3-second deduplication cache.
   - **Deployment**: Configured for Vercel. Vercel uses the serverless function located in `api/clean.js`. 

2. **Android Custom Keyboard (IME) (`android-ime/`)**
   - **Status**: Code written, pending build via GitHub Actions.
   - **Tech**: Kotlin, Android SDK, OkHttp, Coroutines.
   - **Features**: Native Android keyboard that listens to your voice, cleans it using Groq API, and types directly into any text field (WhatsApp, SMS, etc.).

## 🔑 Environment Variables

To make the AI cleanup work, you need a Groq API Key:
- **Local Web App**: Create a `.env` file in the `server/` directory with `GROQ_API_KEY=gsk_your_key_here`.
- **Vercel**: Add `GROQ_API_KEY` to your Vercel project environment variables.
- **Android IME**: The key must be hardcoded in `android-ime/app/src/main/java/com/majesticaxt/smartdictation/DictationIME.kt` on line 37: `private const val GROQ_API_KEY = "gsk_your_key_here"`. *(Make sure to add it before building the APK!)*

## 🚀 How to Build the Android Keyboard (APK)

Since downloading Gradle locally timed out, we configured a **GitHub Actions** workflow to build the APK in the cloud for free.

**Follow these steps to get your APK:**

1. **Add your Groq API Key**
   Open `android-ime/app/src/main/java/com/majesticaxt/smartdictation/DictationIME.kt` and paste your key on line 37.

2. **Push the code to GitHub**
   Open your terminal in the root project folder (`c:\Users\Adegboye Alex\antigravyproj`) and run:
   ```bash
   git add .
   git commit -m "Add Android IME and GitHub Actions workflow"
   git push origin main
   ```

3. **Download the APK**
   - Go to your GitHub repository: [https://github.com/Majesticaxt/smart-dictation](https://github.com/Majesticaxt/smart-dictation)
   - Click on the **Actions** tab at the top.
   - You will see a workflow running named "Build Android IME APK".
   - Wait for it to finish (about 5 minutes).
   - Click on the completed run, scroll down to the **Artifacts** section, and download **SmartDictationIME-debug**.
   - Extract the downloaded zip file to get your `app-debug.apk`.

4. **Install on your Phone**
   - Transfer the `.apk` file to your Android phone.
   - Open it and install it.
   - Open the "Smart Dictation" app from your app drawer. It will guide you to grant microphone permissions and enable the keyboard in your Android settings.

## 🛠️ Next Steps / Where We Left Off
- The immediate next step is to run the Git commands above to trigger the GitHub Actions build so you can get the APK for your custom Android keyboard.
