# Smart Dictation — Chat Session Log (April 25-27, 2026)

## Session Goals
1. Convert the web app into a PWA for Android
2. Fix text duplication bug on Android
3. Deploy to Vercel for public access
4. Build a native Android custom keyboard (IME)
5. Set up CI/CD to build the APK via GitHub Actions

---

## Timeline

### 🔧 PWA Conversion
- Added `manifest.json` with app name, icons, standalone display, theme color
- Created `sw.js` service worker for offline caching
- Updated `index.html` with PWA meta tags and Apple mobile web app support
- Registered service worker in `main.jsx`
- Added mobile-responsive CSS (768px breakpoint, safe areas, touch-friendly buttons)
- Upgraded Copy button to use Web Share API on Android (native share sheet)
- Generated app icon using AI image generation

### 🐛 Android Text Duplication Fix
- **Problem**: Speech recognition text was tripling on Android Chrome
- **Cause**: Restarting the same `SpeechRecognition` instance caused Android to replay old results
- **Fix**: 
  - Create a fresh `SpeechRecognition` instance on every restart
  - Added 3-second deduplication cache to skip identical transcripts
  - Added `shouldBeListeningRef` to separate user intent from recognition state

### 🚀 Vercel Deployment
- Created `vercel.json` with build config and API rewrites
- Created `api/clean.js` serverless function (same Groq logic as Express)
- Changed API base URL from `localhost:3001` to relative `/api`
- Added Vite dev proxy so local development still works
- Pushed to GitHub: `https://github.com/Majesticaxt/smart-dictation`

### 📱 Android IME Keyboard
- Built full native Android keyboard in Kotlin
- **DictationIME.kt**: Core service with speech recognition, Groq AI cleanup, `commitText()` for typing into any field
- **SetupActivity.kt**: Guides user through mic permission and keyboard enablement
- **keyboard_view.xml**: Dark-themed UI with mic button, preview area, action buttons
- **method.xml**: IME registration metadata
- API key injected via `BuildConfig` (not hardcoded) for security

### 🏗️ GitHub Actions CI/CD (7 Build Attempts)

| Attempt | Error | Fix |
|---|---|---|
| #1 | Push blocked — Groq API key exposed in code | Rewrote git history with orphan branch, moved key to BuildConfig |
| #2 | `ClassNotFoundException: -Xmx64m` | Replaced broken custom gradlew with official Gradle action |
| #3 | AGP 8.5.0 requires Gradle 8.7 minimum | Downgraded to AGP 8.2.0 + Gradle 8.2 (stable combo) |
| #4 | Dependency resolution failed | Added `android-actions/setup-android` + explicit SDK component install |
| #5 | `android.useAndroidX` property not enabled | Created `gradle.properties` with `android.useAndroidX=true` |
| #6 | Missing `@mipmap/ic_launcher` resources | Switched to built-in `@android:mipmap/sym_def_app_icon` |
| #7 | `textColor="white"` invalid in Android XML | Changed to `textColor="#ffffff"` |
| **#8** | **✅ SUCCESS** | APK built and uploaded as artifact |

---

## Commands Used

```bash
# Initial GitHub push
git init
git add .
git commit -m "Smart Dictation PWA"
git remote add origin https://github.com/Majesticaxt/smart-dictation.git
git push -u origin main

# Fix exposed API key (rewrite history)
git checkout --orphan clean
git add .
git commit -m "Smart Dictation - initial release"
git branch -D main
git branch -m main
git push origin main --force

# Subsequent pushes (after each fix)
git add . && git commit -m "fix: message" && git push origin main
```

---

## Key Files Created/Modified This Session

### PWA Files
- `client/public/manifest.json` — PWA manifest
- `client/public/sw.js` — Service worker
- `client/index.html` — PWA meta tags added
- `client/src/main.jsx` — SW registration added
- `client/src/index.css` — Mobile responsive CSS added
- `client/src/App.jsx` — Web Share API added

### Vercel Deployment
- `vercel.json` — Build + routing config
- `api/clean.js` — Serverless Groq function
- `client/src/utils/api.js` — Base URL changed to `/api`
- `client/vite.config.js` — Dev proxy added

### Android IME
- `android-ime/app/src/main/AndroidManifest.xml`
- `android-ime/app/src/main/java/com/majesticaxt/smartdictation/DictationIME.kt`
- `android-ime/app/src/main/java/com/majesticaxt/smartdictation/SetupActivity.kt`
- `android-ime/app/src/main/res/layout/keyboard_view.xml`
- `android-ime/app/src/main/res/layout/activity_setup.xml`
- `android-ime/app/src/main/res/xml/method.xml`
- `android-ime/app/src/main/res/values/strings.xml`
- `android-ime/app/build.gradle`
- `android-ime/build.gradle`
- `android-ime/settings.gradle`
- `android-ime/gradle.properties`
- `android-ime/gradle/wrapper/gradle-wrapper.properties`
- `android-ime/app/proguard-rules.pro`

### CI/CD
- `.github/workflows/build-android.yml`

### Documentation
- `PROJECT_STATE.md`

---

## How to Resume

### Run the web app locally
```bash
# Terminal 1
cd client && npm run dev

# Terminal 2
cd server && npm run dev
```

### Build a new Android APK
Push any change to `android-ime/` → GitHub Actions auto-builds → download from Actions tab.

### Deploy web changes
Push to `main` branch → Vercel auto-deploys.

### Install Android keyboard
1. Download APK from GitHub Actions artifacts
2. Transfer to phone → install
3. Open Smart Dictation app → grant mic → enable keyboard
4. Switch to Smart Dictation keyboard in any app

---

## Environment Variables

| Location | Variable | Value |
|---|---|---|
| `server/.env` | `GROQ_API_KEY` | Your Groq API key (local dev) |
| Vercel Dashboard | `GROQ_API_KEY` | Your Groq API key (production) |
| GitHub Secrets | `GROQ_API_KEY` | Your Groq API key (APK builds) |
