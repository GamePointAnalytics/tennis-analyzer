# Tennis Analyzer

Tennis Analyzer is a micro-level tennis performance analysis mobile app. Use this app to track point-by-point match data and generate detailed statistical analysis, including serve percentages, high pressure points win percentage, serve direction patterns, and more. Coaches and players can use this app to conduct real-time, micro-level performance analysis, compare players, discover patterns, and identify areas for improvement.

This app may be used simply as a score tracker. However, to generate detailed statistical analysis, the user must enter information such as serve direction, shot count, last shot type, and shot result on a point by point basis. Therefore, this app requires a high level of concentration during the match. 

The frontend is a native mobile app built using React Native and Expo, and the backend is built using Google Sheets and Google Apps Script.

## Repository Structure

- **`backend/`**: Server-side logic.
  - Core File: `src/MicroStats.js` 
  - Handles data processing and statistical calculations.
- **`frontend-native/`**: React Native mobile application.
  - Built with Expo, SQLite local cache, and native UI elements.

## Key Links

**🌐 Project Website: [gamepointanalytics.github.io/tennis-analyzer/](https://gamepointanalytics.github.io/tennis-analyzer/)**

### App Downloads
- **Google Play Store**: [Download for Android](https://play.google.com/store/apps/details?id=com.appsheet.whitelabel.guid_3d2e670b_8bc7_4bf0_af4a_cf4108cfc997&pli=1)

### Documentation & Tutorials
- **[FAQ.pdf](docs/FAQ.pdf)** - Frequently Asked Questions

### Sample Reports

#### Professional Matches
- **[Carlos Alcaraz vs Jannik Sinner](docs/alcaraz_sinner.pdf)** (2022 US Open QF)
- **[Stefanos Tsitsipas vs Novak Djokovic](docs/tsitsipas_djokovic.pdf)** (2023 Australian Open Final)
- **[Rafael Nadal vs Roger Federer](docs/nadal_federer.pdf)** (2017 Australian Open Final)
- **[Iga Swiatek vs Elena Rybakina](docs/swiatek_rybakina.pdf)** (2023 Australian Open 4R)
- **[Ash Barty vs Danielle Collins](docs/barty_collins.pdf)** (2022 Australian Open Final)
- **[Ash Barty vs Elena Rybakina](docs/barty_rybakina.pdf)** (2022 WTA Adelaide Final)

#### College Matches
- **[Brandon Holt vs Mikael Torpegaard](docs/holt_torpegaard.pdf)** (2018 NCAA, USC vs Ohio State)
- **[Mackenzie McDonald vs Yannick Hanfmann](docs/mcdonald_hanfmann.pdf)** (2015 NCAA, UCLA vs USC)

### AI Insights

Detailed AI-generated insights and analysis for key matches:

- **[Carlos Alcaraz vs Jannik Sinner - AI Insights](docs/alcaraz_ai_insight.pdf)**
- **[Rafael Nadal vs Roger Federer - AI Insights](docs/nadal_ai_insight.pdf)**
- **[Iga Swiatek vs Elena Rybakina - AI Insights](docs/swiatek_ai_insight.pdf)**
- **[Ash Barty vs Danielle Collins - AI Insights](docs/collins_ai_insight.pdf)**
- **[Ash Barty vs Elena Rybakina - AI Insights](docs/barty_ai_insight.pdf)**
- **[Elena Rybakina - AI Insights](docs/rybakina_ai_insight.pdf)**
- **[Jannik Sinner - AI Insights](docs/sinner_ai_insight.pdf)**
- **[Roger Federer - AI Insights](docs/federer_ai_insight.pdf)**

### User Metrics
- 500+ downloads, 80+ installed audience, and 30-40 monthly active users

---

## Development (React Native / Expo)

The native mobile app lives in `frontend-native/`. It is built with **Expo SDK 56** and
**React Native**, and packaged into a standalone APK using the Android Gradle build system.

### Prerequisites

| Tool | Notes |
|---|---|
| Node.js | v18 or later |
| Java JDK | v17 recommended (check with `java -version`) |
| Android SDK | Installed via Android Studio |
| ADB | Bundled with Android SDK; ensure it is on your PATH |
| USB debugging | Enabled on your Android phone |

### Build a release APK (local, unsigned-but-aligned)

```powershell
# 1. Navigate to the native app folder
cd frontend-native

# 2. Install Node dependencies (only needed after cloning or npm install changes)
npm install

# 3. Generate the release APK
.\gradlew assembleRelease
```

The APK is written to:
```
frontend-native\app\build\outputs\apk\release\app-release.apk
```

Build time is typically 2–5 minutes. Subsequent builds are faster due to Gradle's incremental cache.

> [!WARNING]
> If you run `npx expo prebuild --clean` (e.g. to update icons or change the package name),
> it wipes the entire `android/` folder including `local.properties`. You must recreate it:
> ```
> # android/local.properties
> sdk.dir=C\:\\Users\\yingz\\AppData\\Local\\Android\\Sdk
> ```
> Without this file, the Gradle build will fail with **"SDK location not found"**.

### Install the APK on your phone

```powershell
# Connect your phone via USB, then from the frontend-native folder:
adb install -r app\build\outputs\apk\release\app-release.apk
```

- `-r` = **replace** (reinstall over existing version, preserving local data)
- Omit `-r` for a completely fresh install (wipes local SQLite data)
- Run `adb devices` first to confirm your phone is recognized

### Change the app name

The display name shown on the home screen is set in:
```
frontend-native\app.json  →  "name" and "displayName" fields
```
After changing, rebuild with `.\gradlew assembleRelease`.

### Check for syntax errors

```powershell
# Check a single file
node --check src\screens\AnalysisScreen.js

# Check all JS files under src\
Get-ChildItem -Recurse -Filter "*.js" src | ForEach-Object {
    $r = node --check $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: $($_.Name) — $r" }
}
Write-Host "Done"
```

### Backend (Google Apps Script)

The backend lives in `backend/src/MicroStats.js`. It runs entirely inside Google Sheets
as a Google Apps Script web app. To deploy updates:

1. Open the Google Sheet → **Extensions → Apps Script**
2. Copy the contents of `backend/src/MicroStats.js` into the editor (replace existing)
3. Click **Deploy → Manage Deployments → Edit (pencil icon)**
4. Bump the version, click **Deploy**
5. Copy the new Web App URL if it changed and update the app's settings screen

To verify the deployed version matches your local file, search for a unique string
(e.g. `doPost`) in the Apps Script editor — if not found, the old version is deployed.

---

## Troubleshooting

### "SDK location not found"

Caused by a missing `android/local.properties` file (wiped by `npx expo prebuild --clean`).

**Fix:** Recreate the file:
```powershell
Set-Content frontend-native\android\local.properties "sdk.dir=C\:\\Users\\yingz\\AppData\\Local\\Android\\Sdk"
```

### "Gradle requires JVM 17 or later"

Your system default Java is too old. Android Studio bundles JDK 21.

**Fix:** Set `JAVA_HOME` permanently (run PowerShell as Administrator, one-time):
```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "Machine")
```
Then close and reopen your terminal.

### "Filename longer than 260 characters" (CMake / Ninja)

Windows has a 260-character path limit. CMake and Ninja enforce this regardless of the
`LongPathsEnabled` registry setting. If your project path is deep, C++ compilation fails.

**Fix:** Keep the project in a short root path like `C:\dev\tennis-analyzer\`.

### After moving the project to a new folder

If you move (or clone) the project to a different directory, the build will fail because
Gradle, CMake, and node_modules all cache absolute paths from the old location.

**Fix — full clean rebuild from the new location:**
```powershell
cd C:\dev\tennis-analyzer\frontend-native

# 1. Reinstall all npm packages (resolves paths to the new location)
Remove-Item -Recurse -Force node_modules
npm install

# 2. Regenerate the entire android/ folder
npx expo prebuild --platform android --clean

# 3. Recreate local.properties (always wiped by prebuild --clean)
Set-Content android\local.properties "sdk.dir=C\:\\Users\\yingz\\AppData\\Local\\Android\\Sdk"

# 4. Build
cd android
.\gradlew assembleRelease
```

> [!IMPORTANT]
> You must do ALL four steps. Skipping any one of them will leave stale paths from the
> old location cached in `node_modules`, `android/app/.cxx`, or `.gradle` build artifacts.

### After running `npx expo prebuild --clean`

This command wipes and regenerates the entire `android/` folder. You must:
1. Recreate `android/local.properties` (see above)
2. Run `.\gradlew clean assembleRelease` (the C++ cache in `.cxx` is also wiped,
   so the first rebuild is slower — about 5–10 minutes)
