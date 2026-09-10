import JSZip from 'jszip';
import { AppConfig } from '../types';
import {
  generateActivityMainXml,
  generateActivitySplashXml,
  generateBuildGradle,
  generateMainActivityKt,
  generateManifestXml,
  generateSplashActivityKt,
  generateThemesXml,
  generateAppConfigJson,
  generateFilePathsXml,
} from './codeGenerator';

export async function exportAndroidProjectZip(config: AppConfig): Promise<Blob> {
  const zip = new JSZip();
  const packagePath = config.packageName.replace(/\./g, '/');

  // Root project files
  zip.file(
    'build.gradle.kts',
    `// Top-level build file
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
}
`
  );

  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        ${config.adNetwork === 'startio' ? 'maven { url = uri("https://mvn.startapp.com/android") }' : ''}
    }
}

rootProject.name = "${config.appName.replace(/[^a-zA-Z0-9_-]/g, '_')}"
include(":app")
`
  );

  zip.file(
    'gradle.properties',
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
`
  );

  // GitHub Actions Workflow for automated 1-click cloud APK building
  const githubFolder = zip.folder('.github/workflows')!;
  githubFolder.file(
    'build.yml',
    `name: Build ${config.appName} APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    name: Compile Android APK
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4

      - name: Build Debug APK
        run: |
          chmod +x ./gradlew || true
          ./gradlew assembleDebug --no-daemon --stacktrace || gradle assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: ${config.appName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-apk
          path: app/build/outputs/apk/debug/*.apk
          retention-days: 30
`
  );

  // App module
  const appFolder = zip.folder('app')!;
  appFolder.file('build.gradle.kts', generateBuildGradle(config));
  appFolder.file(
    'proguard-rules.pro',
    `# Proguard rules for Fullscreen WebView & Ads
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

${
  config.adNetwork === 'admob'
    ? `# Google Mobile Ads (GMA) Next-Gen SDK rules
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.libraries.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**`
    : ''
}
${
  config.adNetwork === 'startio'
    ? `# Start.io In-App SDK 5.1.0 rules
-keep class com.startapp.** { *; }
-dontwarn com.startapp.**`
    : ''
}
`
  );

  // Source files
  const mainFolder = appFolder.folder('src/main')!;
  mainFolder.file('AndroidManifest.xml', generateManifestXml(config));

  // Kotlin source code
  const javaFolder = mainFolder.folder(`java/${packagePath}`)!;
  javaFolder.file('MainActivity.kt', generateMainActivityKt(config));
  javaFolder.file('SplashActivity.kt', generateSplashActivityKt(config));

  // Resources
  const resFolder = mainFolder.folder('res')!;
  const layoutFolder = resFolder.folder('layout')!;
  layoutFolder.file('activity_main.xml', generateActivityMainXml(config));
  layoutFolder.file('activity_splash.xml', generateActivitySplashXml(config));

  const valuesFolder = resFolder.folder('values')!;
  valuesFolder.file('themes.xml', generateThemesXml());
  valuesFolder.file(
    'strings.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
</resources>`
  );
  valuesFolder.file(
    'colors.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="splash_bg">${config.splashBgColor}</color>
</resources>`
  );

  const xmlFolder = resFolder.folder('xml')!;
  xmlFolder.file('file_paths.xml', generateFilePathsXml());

  // Readme instructions
  const isAdMob = config.adNetwork === 'admob';
  const isStartIo = config.adNetwork === 'startio';
  zip.file(
    'README.md',
    `# ${config.appName} - Android Fullscreen APK Project

Generated with Web to APK Creator.

## App Specifications
- **App Name**: ${config.appName}
- **Package Name**: ${config.packageName}
- **Target Website**: ${config.websiteUrl}
- **Min SDK**: 23 (Android 6.0 Marshmallow)
- **Target SDK**: 36 (Android 16 Baklava)
- **Compile SDK**: 36 (Android 16 Baklava)
- **APK Signature Schemes**: v1 (JAR), v2 (APK Signature Block), v3 (Key Rotation), v4 (Streaming / fs-verity)
- **Display Mode**: Pure Fullscreen Immersive Mode (No top status bar, no bottom navigation bar)
- **Ad Network**: ${config.adNetwork.toUpperCase()}
${
  isAdMob
    ? `- **AdMob SDK**: Google Mobile Ads (GMA) Next-Gen SDK (24.0.0)
- **AdMob App ID**: ${config.admob.appId || 'None'}
- **Banner Ad ID**: ${config.admob.bannerId || 'None'}
- **Interstitial Ad ID**: ${config.admob.interstitialId || 'None'}
- **Rewarded Ad ID**: ${config.admob.rewardedId || 'None'}`
    : ''
}
${
  isStartIo
    ? `- **Start.io SDK**: In-App SDK 5.1.0 (com.startapp:inapp-sdk:5.1.0)
- **Start.io App ID**: ${config.startio.appId}
- **Banner Ad**: ${config.startio.showBanner ? 'Enabled' : 'Disabled'}
- **Interstitial Ad**: ${config.startio.showInterstitial ? 'Enabled' : 'Disabled'}
- **Rewarded Ad**: ${config.startio.showRewarded ? 'Enabled' : 'Disabled'}`
    : ''
}

---

## How to Build the APK (Easy 3-Step Guide)

### Method 1: Using Android Studio (Recommended)
1. Extract this ZIP file onto your computer.
2. Open **Android Studio**, click **Open Project**, and select this extracted folder.
3. Wait for Gradle Sync to complete (1-2 minutes).
4. Go to top menu: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. Once finished, click **locate** in the bottom-right balloon to get your debug/release APK!

### Method 2: Command Line (Fastest)
Run in the project directory:
\`\`\`bash
# Linux / macOS
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug
\`\`\`
The APK file will be generated at:
\`app/build/outputs/apk/debug/app-debug.apk\`

---

## বাংলা নির্দেশিকা (Bengali Instructions)
১. এই জিপ (ZIP) ফাইলটি আপনার কম্পিউটারে আনজিপ / Extract করুন।
২. **Android Studio** ওপেন করে **Open Project** দিয়ে এই ফোল্ডারটি সিলেক্ট করুন।
৩. গ্র্যাডেল সিঙ্ক (Gradle Sync) শেষ হলে **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** এ ক্লিক করুন।
৪. কয়েক সেকেন্ডে আপনার ফুলস্ক্রিন APK তৈরি হয়ে যাবে!
`
  );

  // Config backup
  zip.file('app-config.json', generateAppConfigJson(config));

  // Generate ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}
