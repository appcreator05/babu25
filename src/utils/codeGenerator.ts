import { AppConfig } from '../types';

export function generateManifestXml(config: AppConfig): string {
  const isAdMob = config.adNetwork === 'admob';
  const isStartIo = config.adNetwork === 'startio';
  const p = config.permissions || {
    internet: true,
    accessNetworkState: true,
    accessCoarseLocation: false,
    accessFineLocation: false,
    camera: false,
    readExternalStorage: true,
    writeExternalStorage: true,
    recordAudio: false,
    modifyAudioSettings: false,
    vibrate: true,
  };

  let orientationAttr = '';
  if (config.orientation === 'portrait') {
    orientationAttr = 'android:screenOrientation="portrait"';
  } else if (config.orientation === 'landscape') {
    orientationAttr = 'android:screenOrientation="landscape"';
  } else if (config.orientation === 'auto_rotate') {
    orientationAttr = 'android:screenOrientation="unspecified"';
  }

  // Extract host domain for deep linking
  let domain = 'example.com';
  try {
    const parsed = new URL(config.websiteUrl);
    domain = parsed.hostname;
  } catch {
    domain = config.websiteUrl.replace(/https?:\/\//, '').split('/')[0] || 'example.com';
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}"
    android:versionCode="${config.versionCode || 1}"
    android:versionName="${config.versionName || '1.0.0'}">

    <!-- Configured App Permissions -->
    ${p.internet ? '<uses-permission android:name="android.permission.INTERNET" />' : ''}
    ${p.accessNetworkState ? '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />' : ''}
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    ${p.accessCoarseLocation ? '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />' : ''}
    ${p.accessFineLocation ? '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />' : ''}
    ${p.camera ? '<uses-permission android:name="android.permission.CAMERA" />' : ''}
    ${p.readExternalStorage ? '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />' : ''}
    ${p.writeExternalStorage ? '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />' : ''}
    ${p.recordAudio ? '<uses-permission android:name="android.permission.RECORD_AUDIO" />' : ''}
    ${p.modifyAudioSettings ? '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />' : ''}
    ${p.vibrate ? '<uses-permission android:name="android.permission.VIBRATE" />' : ''}
    <!-- Advertising ID Permission (Mandatory for Android 13+ / API 33+ real live ads) -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />

    <!-- Package queries for WhatsApp, Chrome Custom Tabs, and Native System Sharing (Android 11+) -->
    <queries>
        <package android:name="com.whatsapp" />
        <package android:name="com.whatsapp.w4b" />
        <intent>
            <action android:name="android.support.customtabs.action.CustomTabsService" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="*/*" />
        </intent>
    </queries>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.FullScreenApp">

        ${
          isAdMob
            ? `<!-- Google AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${config.admob.appId || 'ca-app-pub-3940256099942544~3347511713'}" />`
            : ''
        }
        ${
          isStartIo
            ? `<!-- Start.io SDK Config -->
        <meta-data
            android:name="com.startapp.sdk.APPLICATION_ID"
            android:value="${config.startio.appId}" />`
            : ''
        }

        <!-- Splash Activity -->
        <activity
            android:name=".SplashActivity"
            android:exported="true"
            ${orientationAttr}
            android:theme="@style/Theme.FullScreenApp.Splash">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Main WebView Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.FullScreenApp">
            ${
              config.deepLinking
                ? `<!-- Deep Linking Intent Filter for ${domain} -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${domain}" />
                <data android:scheme="http" android:host="${domain}" />
            </intent-filter>`
                : ''
            }
        </activity>

        <!-- FileProvider for secure APK installation and direct WhatsApp/Native file sharing -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${config.packageName}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>`;
}

export function generateMainActivityKt(config: AppConfig): string {
  const isAdMob = config.adNetwork === 'admob';
  const isStartIo = config.adNetwork === 'startio';

  return `package ${config.packageName}

import android.annotation.SuppressLint
import android.app.Dialog
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.io.File
import java.io.FileOutputStream
${
  isAdMob
    ? `import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback`
    : ''
}
${
  isStartIo
    ? `import com.startapp.sdk.adsbase.StartAppAd
import com.startapp.sdk.adsbase.StartAppSDK
import com.startapp.sdk.ads.banner.Banner`
    : ''
}

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var loadingSpinner: ProgressBar
    private lateinit var adContainer: FrameLayout
${
  isAdMob
    ? `    private var adView: AdView? = null
    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null`
    : ''
}
${
  isStartIo
    ? `    private var startAppAd: StartAppAd? = null`
    : ''
}

    // Interstitial Ad Frequency Timer (${config.interstitialIntervalMinutes || 3} minutes)
    private val interstitialIntervalMs = ${Math.max(1, config.interstitialIntervalMinutes || 3)}L * 60L * 1000L
    private val adTimerHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val adTimerRunnable = object : Runnable {
        override fun run() {
            ${isAdMob ? 'showInterstitialIfReady()' : isStartIo ? 'showStartIoInterstitial()' : '// No ads configured'}
            adTimerHandler.postDelayed(this, interstitialIntervalMs)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. ENABLE PURE FULLSCREEN IMMERSIVE MODE (Hides Top Status Bar & Bottom Navigation Bar)
        ${config.fullscreenMode ? 'setupFullscreenImmersive()' : '// Fullscreen disabled in settings'}

        // 2. Initialize UI Elements
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        loadingSpinner = findViewById(R.id.loadingSpinner)
        adContainer = findViewById(R.id.adContainer)

        // 3. Configure Fullscreen WebView
        setupWebView()

        // 4. Initialize Ads (${config.adNetwork.toUpperCase()})
        setupAds()

        // 5. Handle Back Navigation (Back within WebView history before exiting)
        setupBackNavigation()
    }

    /**
     * Hides both Top Status Bar and Bottom Navigation Bar.
     * Keeps screen completely immersive without system bars interfering.
     */
    private fun setupFullscreenImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )

        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
            if ((visibility and View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                // Re-hide bars if user briefly gestures
                controller.hide(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            ${config.fullscreenMode ? 'setupFullscreenImmersive()' : ''}
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadsImagesAutomatically = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(${config.allowZoom})
        settings.builtInZoomControls = ${config.allowZoom}
        settings.displayZoomControls = false
        settings.saveFormData = ${Boolean(config.saveFormData)}
        ${config.enableGpsPrompt ? 'settings.setGeolocationEnabled(true)' : ''}

        // Popup Redirects, Subscriptions & Payment Gateway Window Support
        ${
          config.enablePaymentRedirects !== false
            ? `settings.setSupportMultipleWindows(true)
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)`
            : ''
        }

        // Cache Mode Configuration (${config.cacheMode || 'default_cache'})
        settings.cacheMode = ${
          config.cacheMode === 'no_cache'
            ? 'WebSettings.LOAD_NO_CACHE'
            : config.cacheMode === 'highly_cached'
            ? 'WebSettings.LOAD_CACHE_ELSE_NETWORK'
            : 'WebSettings.LOAD_DEFAULT'
        }

        // Text Selection Configuration
        ${
          !config.textSelection
            ? `webView.isLongClickable = false
        webView.setOnLongClickListener { true }`
            : '// Text selection enabled'
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                    ${config.showProgressWheel !== false ? 'loadingSpinner.visibility = View.VISIBLE' : ''}
                } else {
                    progressBar.visibility = View.GONE
                    ${config.showProgressWheel !== false ? 'loadingSpinner.visibility = View.GONE' : ''}
                }
            }

            ${
              config.enablePaymentRedirects !== false
                ? `// Popup Redirects: Opens payment gateways, 3D secure windows, and subscription modals
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val newWebView = WebView(this@MainActivity).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.setSupportMultipleWindows(true)
                    settings.javaScriptCanOpenWindowsAutomatically = true
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(v: WebView?, req: WebResourceRequest?): Boolean {
                            val targetUrl = req?.url?.toString() ?: return false
                            if (handleSpecialOrPaymentUrl(targetUrl)) {
                                return true
                            }
                            return false
                        }
                    }
                }

                val popupDialog = Dialog(this@MainActivity, android.R.style.Theme_Black_NoTitleBar_Fullscreen).apply {
                    setContentView(newWebView)
                    setOnDismissListener {
                        newWebView.destroy()
                    }
                }
                popupDialog.show()

                val transport = resultMsg?.obj as? WebView.WebViewTransport
                transport?.webView = newWebView
                resultMsg?.sendToTarget()
                return true
            }`
                : ''
            }

            ${
              config.enableGpsPrompt
                ? `override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: android.webkit.GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }`
                : ''
            }
        }

        // Native Android Bridge for Web Downloads and MediaStore saving
        val bridge = AndroidBridge()
        webView.addJavascriptInterface(bridge, "AndroidDownloader")
        webView.addJavascriptInterface(bridge, "AndroidApp")
        webView.addJavascriptInterface(bridge, "Android")
        webView.addJavascriptInterface(bridge, "JSBridge")

        setupDownloadListener()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                if (url.startsWith("blob:") || url.startsWith("data:")) {
                    return false
                }

                // 1. Payment Gateways, Wallet Apps (bKash, Nagad, UPI, Paytm, GPay) and Deep Link Intents
                if (handleSpecialOrPaymentUrl(url)) {
                    return true
                }

                // 2. Direct Binary Downloads (.apk, .aab, .zip, download routes) -> Always open in Custom Tabs
                val lowerUrl = url.lowercase()
                if (lowerUrl.endsWith(".apk") || lowerUrl.endsWith(".aab") || lowerUrl.endsWith(".zip") ||
                    lowerUrl.contains("/api/download/") || lowerUrl.contains("/dl/") ||
                    lowerUrl.contains("tmpfiles.org") || lowerUrl.contains("download")) {
                    openInCustomTabs(url)
                    return true
                }

                // 3. Custom Tabs for External Links
                ${
                  config.useCustomTabs
                    ? `val currentHost = Uri.parse("${config.websiteUrl}").host ?: ""
                val targetHost = request?.url?.host ?: ""
                if (targetHost.isNotBlank() && !currentHost.equals(targetHost, ignoreCase = true) && !targetHost.endsWith(currentHost)) {
                    openInCustomTabs(url)
                    return true
                }`
                    : ''
                }

                view?.loadUrl(url)
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
                ${config.showProgressWheel !== false ? 'loadingSpinner.visibility = View.VISIBLE' : ''}
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                ${config.showProgressWheel !== false ? 'loadingSpinner.visibility = View.GONE' : ''}
                ${!config.textSelection ? `view?.evaluateJavascript("document.body.style.webkitUserSelect='none'; document.body.style.userSelect='none';", null)` : ''}
            }

            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                progressBar.visibility = View.GONE
                ${config.showProgressWheel !== false ? 'loadingSpinner.visibility = View.GONE' : ''}
            }
        }

        // Load targeted Website URL
        webView.loadUrl("${config.websiteUrl}")
    }

    private fun setupDownloadListener() {
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            try {
                // Open in Chrome Custom Tabs so Chrome handles full background download and saving
                openInCustomTabs(url)
            } catch (e: Exception) {
                try {
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    val fileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
                    val request = DownloadManager.Request(Uri.parse(url)).apply {
                        setMimeType(mimetype)
                        setTitle(fileName)
                        setDescription("Downloading file...")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    }
                    dm.enqueue(request)
                    Toast.makeText(this, "Download started: $fileName", Toast.LENGTH_SHORT).show()
                } catch (err: Exception) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                    } catch (err2: Exception) {
                        Toast.makeText(this, "Download error: \${err2.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    fun saveBytesToDownloads(fileBytes: ByteArray, requestedFileName: String, mimeType: String): File? {
        val fileName = if (requestedFileName.isNotBlank()) requestedFileName else "app-download.apk"
        var resultFile: File? = null

        // 1. Direct write to public Downloads folder (/storage/emulated/0/Download/)
        try {
            val publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!publicDownloadsDir.exists()) {
                publicDownloadsDir.mkdirs()
            }
            val targetFile = File(publicDownloadsDir, fileName)
            FileOutputStream(targetFile).use { outputStream ->
                outputStream.write(fileBytes)
                outputStream.flush()
            }
            if (targetFile.exists() && targetFile.length() > 0) {
                resultFile = targetFile
                MediaScannerConnection.scanFile(
                    this,
                    arrayOf(targetFile.absolutePath),
                    arrayOf(mimeType),
                    null
                )
                try {
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                    dm?.addCompletedDownload(
                        fileName,
                        "Downloaded app",
                        true,
                        mimeType,
                        targetFile.absolutePath,
                        targetFile.length(),
                        true
                    )
                } catch (ignored: Exception) {}
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. In Android 10+ (Q+), also publish via MediaStore.Downloads with IS_PENDING = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val resolver = contentResolver
                try {
                    resolver.delete(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        "\${MediaStore.MediaColumns.DISPLAY_NAME} = ?",
                        arrayOf(fileName)
                    )
                } catch (ignored: Exception) {}

                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri, "rwt")?.use { outputStream ->
                        outputStream.write(fileBytes)
                        outputStream.flush()
                    }
                    contentValues.clear()
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        val fallbackFile = try {
            val fallbackDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
            val fallback = File(fallbackDir, fileName)
            FileOutputStream(fallback).use { it.write(fileBytes) }
            fallback
        } catch (e: Exception) {
            null
        }

        return resultFile ?: fallbackFile
    }

    fun promptInstallApk(file: File) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!packageManager.canRequestPackageInstalls()) {
                    val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    val appLabel = applicationInfo.loadLabel(packageManager).toString()
                    Toast.makeText(this, "Please allow 'Install unknown apps' to install $appLabel", Toast.LENGTH_LONG).show()
                    return
                }
            }
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Saved to Downloads: \${file.name}", Toast.LENGTH_LONG).show()
        }
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun saveBase64File(base64Data: String, fileName: String, mimeType: String) {
            Thread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) {
                        base64Data.substringAfter(",")
                    } else {
                        base64Data
                    }
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val targetMime = if (mimeType.isNotBlank()) mimeType else "application/vnd.android.package-archive"
                    val savedFile = saveBytesToDownloads(bytes, fileName, targetMime)

                    runOnUiThread {
                        if (savedFile != null) {
                            Toast.makeText(this@MainActivity, "✅ Downloaded: $fileName", Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@MainActivity, "Failed to save: $fileName", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Save error: \${e.localizedMessage}", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }

        @JavascriptInterface
        fun shareApkToWhatsApp(base64Data: String, fileName: String) {
            Thread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val targetMime = if (fileName.endsWith(".aab", true)) {
                        "application/octet-stream"
                    } else if (fileName.endsWith(".zip", true)) {
                        "application/zip"
                    } else {
                        "application/vnd.android.package-archive"
                    }
                    val savedFile = saveBytesToDownloads(bytes, fileName, targetMime)
                    if (savedFile != null && savedFile.exists()) {
                        val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", savedFile)
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "*/*"
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        runOnUiThread {
                            try {
                                val waIntent = Intent(intent).setPackage("com.whatsapp")
                                startActivity(waIntent)
                            } catch (e: Exception) {
                                try {
                                    val waBizIntent = Intent(intent).setPackage("com.whatsapp.w4b")
                                    startActivity(waBizIntent)
                                } catch (e2: Exception) {
                                    val chooser = Intent.createChooser(intent, "Share $fileName via WhatsApp").apply {
                                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    }
                                    startActivity(chooser)
                                }
                            }
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "Failed to prepare $fileName for WhatsApp", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "WhatsApp share error: \${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }.start()
        }

        @JavascriptInterface
        fun shareFileNative(base64Data: String, fileName: String, mimeType: String) {
            Thread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val targetMime = if (mimeType.isNotBlank()) mimeType else "application/vnd.android.package-archive"
                    val savedFile = saveBytesToDownloads(bytes, fileName, targetMime)
                    if (savedFile != null && savedFile.exists()) {
                        val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", savedFile)
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = targetMime
                            putExtra(Intent.EXTRA_STREAM, uri)
                            putExtra(Intent.EXTRA_SUBJECT, fileName)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        runOnUiThread {
                            startActivity(Intent.createChooser(intent, "Share $fileName"))
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Share error: \${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }.start()
        }

        @JavascriptInterface
        fun installDownloadedApk(fileName: String) {
            runOnUiThread {
                try {
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val targetFile = File(downloadsDir, fileName)
                    if (targetFile.exists()) {
                        promptInstallApk(targetFile)
                    } else {
                        val fallbackDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
                        val fallbackFile = File(fallbackDir, fileName)
                        if (fallbackFile.exists()) {
                            promptInstallApk(fallbackFile)
                        } else {
                            Toast.makeText(this@MainActivity, "File not found: $fileName", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Install error: \${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun openInCustomTabs(url: String) {
            runOnUiThread {
                try {
                    val target = if (url.isNotBlank()) url else "${config.websiteUrl}"
                    this@MainActivity.openInCustomTabs(target)
                } catch (e: Exception) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                    } catch (err: Exception) {}
                }
            }
        }

        @JavascriptInterface
        fun downloadUrl(url: String) {
            runOnUiThread {
                if (url.isNotBlank()) {
                    try {
                        val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                        val fileName = URLUtil.guessFileName(url, null, "application/vnd.android.package-archive")
                        val request = DownloadManager.Request(Uri.parse(url)).apply {
                            setMimeType("application/vnd.android.package-archive")
                            setTitle(fileName)
                            setDescription("Downloading file...")
                            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                        }
                        dm.enqueue(request)
                        Toast.makeText(this@MainActivity, "Download started: $fileName", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                        } catch (err: Exception) {
                            Toast.makeText(this@MainActivity, "Download error: \${err.localizedMessage}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        @JavascriptInterface
        fun openDownloadsFolder() {
            runOnUiThread {
                try {
                    val intent = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    try {
                        val downloadsPath = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(Uri.parse(downloadsPath), "*/*")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                    } catch (err: Exception) {
                        Toast.makeText(
                            this@MainActivity,
                            "ফাইলটি আপনার ফোনের Internal Storage > Download ফোল্ডারে সংরক্ষিত আছে",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }
    }

    /**
     * Opens links in Chrome Custom Tabs with modern, secure in-app browsing
     */
    fun openInCustomTabs(url: String) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_ON)
                .build()
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                // Explicitly prefer Chrome package if installed for best compatibility
                customTabsIntent.intent.setPackage("com.android.chrome")
            } catch (_: Exception) {}
            customTabsIntent.launchUrl(this@MainActivity, Uri.parse(url))
        } catch (e: Exception) {
            try {
                val fallback = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(fallback)
            } catch (err: Exception) {
                Toast.makeText(this@MainActivity, "Cannot open: \${err.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Handles Payment Gateways, Mobile Wallets (bKash, Nagad, UPI, Paytm, GPay, PhonePe, Alipay),
     * and Deep-link intents. Allows user to complete checkout and return smoothly to app.
     */
    private fun handleSpecialOrPaymentUrl(url: String): Boolean {
        if (url.startsWith("intent:")) {
            try {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
                    if (resolveInfo != null) {
                        startActivity(intent)
                        return true
                    }
                    val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                    if (!fallbackUrl.isNullOrBlank()) {
                        openInCustomTabs(fallbackUrl)
                        return true
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return true
        }

        // Mobile Wallet Apps, UPI, and Payment Schemes
        if (url.startsWith("upi://") ||
            url.startsWith("bkash://") ||
            url.startsWith("nagad://") ||
            url.startsWith("paytmmp://") ||
            url.startsWith("tez://") ||
            url.startsWith("gpay://") ||
            url.startsWith("phonepe://") ||
            url.startsWith("alipay://") ||
            url.startsWith("tel:") ||
            url.startsWith("mailto:") ||
            url.startsWith("sms:") ||
            url.startsWith("whatsapp:") ||
            url.startsWith("market://")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Wallet or app is not installed on this device", Toast.LENGTH_SHORT).show()
            }
            return true
        }

        return false
    }

    private fun setupAds() {
${
  isAdMob
    ? `        // 100% Real Live Ads Mode: Initialize Google Mobile Ads (GMA) Next-Gen SDK
        MobileAds.initialize(this) { initStatus ->
            val statusMap = initStatus.adapterStatusMap
            for ((adapterClass, status) in statusMap) {
                android.util.Log.d("AdMob", "GMA Next-Gen Adapter: $adapterClass, State: \${status.initializationState}")
            }
            runOnUiThread {
                ${config.admob.bannerId ? 'loadAdMobBanner()' : '// Banner Ad ID not provided'}
                ${config.admob.interstitialId ? `loadAdMobInterstitial("${config.admob.interstitialId}")` : '// Interstitial Ad ID not provided'}
                ${config.admob.rewardedId ? `loadAdMobRewarded("${config.admob.rewardedId}")` : '// Rewarded Ad ID not provided'}
            }
        }`
    : ''
}
${
  isStartIo
    ? `        // 100% Real Live Ads Mode: Initialize Start.io In-App SDK 5.1.0
        StartAppSDK.init(this, "${config.startio.appId}", true)
        StartAppSDK.setTestAdsEnabled(false) // Disable test/demo ads, show real live ads
        StartAppAd.disableSplash()
        startAppAd = StartAppAd(this)

        // 1. Start.io Banner Ad (${config.startio.showBanner ? 'Enabled' : 'Disabled'})
        ${
          config.startio.showBanner
            ? `val startAppBanner = Banner(this)
        val params = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = android.view.Gravity.CENTER
        }
        adContainer.removeAllViews()
        adContainer.addView(startAppBanner, params)`
            : '// Start.io Banner checkbox disabled'
        }

        // 2. Start.io Interstitial Ad (${config.startio.showInterstitial ? 'Enabled' : 'Disabled'})
        ${
          config.startio.showInterstitial
            ? `startAppAd?.loadAd(StartAppAd.AdMode.AUTOMATIC)`
            : '// Start.io Interstitial checkbox disabled'
        }

        // 3. Start.io Rewarded Ad (${config.startio.showRewarded ? 'Enabled' : 'Disabled'})
        ${
          config.startio.showRewarded
            ? `// Rewarded video ready to load when triggered
        startAppAd?.loadAd(StartAppAd.AdMode.REWARDED_VIDEO)`
            : '// Start.io Rewarded checkbox disabled'
        }`
    : ''
}
${
  !isAdMob && !isStartIo
    ? `        // Ads disabled: clean full-screen display without advertisements
        adContainer.visibility = View.GONE`
    : ''
}
    }

${
  isAdMob
    ? `    private fun loadAdMobBanner() {
        val bannerUnitId = "${config.admob.bannerId}".trim()
        if (bannerUnitId.isBlank()) return

        try {
            adView?.destroy()
            adView = AdView(this).apply {
                adUnitId = bannerUnitId
                setAdSize(AdSize.BANNER)
                adListener = object : AdListener() {
                    override fun onAdLoaded() {
                        adContainer.visibility = View.VISIBLE
                        android.util.Log.d("AdMob", "Banner loaded successfully")
                    }
                    override fun onAdFailedToLoad(error: LoadAdError) {
                        android.util.Log.e("AdMob", "Banner failed: \${error.message}, code: \${error.code}")
                    }
                }
            }

            val params = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            }

            adContainer.removeAllViews()
            adContainer.addView(adView, params)

            val adRequest = AdRequest.Builder().build()
            adView?.loadAd(adRequest)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun loadAdMobInterstitial(adUnitId: String) {
        if (adUnitId.isBlank()) return
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(this, adUnitId, adRequest, object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(interstitial: InterstitialAd) {
                interstitialAd = interstitial
                android.util.Log.d("AdMob", "Interstitial loaded successfully")
            }
            override fun onAdFailedToLoad(error: LoadAdError) {
                android.util.Log.e("AdMob", "Interstitial failed: \${error.message}, code: \${error.code}")
                interstitialAd = null
            }
        })
    }

    private fun loadAdMobRewarded(adUnitId: String) {
        if (adUnitId.isBlank()) return
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(this, adUnitId, adRequest, object : RewardedAdLoadCallback() {
            override fun onAdLoaded(rewarded: RewardedAd) {
                rewardedAd = rewarded
                android.util.Log.d("AdMob", "Rewarded ad loaded successfully")
            }
            override fun onAdFailedToLoad(error: LoadAdError) {
                android.util.Log.e("AdMob", "Rewarded ad failed: \${error.message}, code: \${error.code}")
                rewardedAd = null
            }
        })
    }

    fun showInterstitialIfReady() {
        interstitialAd?.show(this) ?: loadAdMobInterstitial("${config.admob.interstitialId}")
    }

    fun showRewardedIfReady() {
        rewardedAd?.let { ad ->
            ad.show(this) { rewardItem ->
                Toast.makeText(this, "Reward earned: \${rewardItem.amount} \${rewardItem.type}", Toast.LENGTH_SHORT).show()
            }
        } ?: loadAdMobRewarded("${config.admob.rewardedId}")
    }`
    : ''
}
${
  isStartIo
    ? `    fun showStartIoInterstitial() {
        ${
          config.startio.showInterstitial
            ? `startAppAd?.showAd()`
            : `// Interstitial disabled in config`
        }
    }

    fun showStartIoRewarded() {
        ${
          config.startio.showRewarded
            ? `startAppAd?.showAd()`
            : `// Rewarded disabled in config`
        }
    }`
    : ''
}

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    ${
                      config.confirmOnExit
                        ? `androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("${config.appName}")
                        .setMessage("Do you want to exit the app?")
                        .setPositiveButton("Exit") { _, _ ->
                            isEnabled = false
                            finish()
                        }
                        .setNegativeButton("Cancel", null)
                        .show()`
                        : `isEnabled = false
                    onBackPressedDispatcher.onBackPressed()`
                    }
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        ${config.fullscreenMode ? 'setupFullscreenImmersive()' : ''}
        webView.onResume()
        ${isAdMob ? 'adView?.resume()' : ''}
        ${isAdMob || isStartIo ? 'adTimerHandler.postDelayed(adTimerRunnable, interstitialIntervalMs)' : ''}
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        ${isAdMob ? 'adView?.pause()' : ''}
        ${isAdMob || isStartIo ? 'adTimerHandler.removeCallbacks(adTimerRunnable)' : ''}
    }

    override fun onDestroy() {
        ${isAdMob ? 'adView?.destroy()' : ''}
        webView.destroy()
        super.onDestroy()
    }
}`;
}

export function generateSplashActivityKt(config: AppConfig): string {
  const durationMs = Math.round(config.splashDuration * 1000);
  return `package ${config.packageName}

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Pure Fullscreen Immersive - Hide Status & Navigation Bars
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        // Navigate to MainActivity after ${config.splashDuration} seconds
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this@SplashActivity, MainActivity::class.java))
            finish()
        }, ${durationMs}L)
    }
}`;
}

export function generateBuildGradle(config: AppConfig): string {
  const isAdMob = config.adNetwork === 'admob';
  const isStartIo = config.adNetwork === 'startio';

  return `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace '${config.packageName}'
    compileSdk 36

    defaultConfig {
        applicationId "${config.packageName}"
        minSdk 23
        targetSdk 36
        versionCode ${config.versionCode || 1}
        versionName "${config.versionName || '1.0.0'}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            storeFile = file("${config.keystore?.useCustomKeystore && config.keystore.keystoreFileName ? config.keystore.keystoreFileName : "release.keystore"}")
            storePassword = "${config.keystore?.storePassword || "release_pass_123"}"
            keyAlias = "${config.keystore?.keyAlias || "release_alias"}"
            keyPassword = "${config.keystore?.keyPassword || "release_pass_123"}"
            v1SigningEnabled = true
            v2SigningEnabled = true
            v3SigningEnabled = true
            v4SigningEnabled = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.browser:browser:1.8.0")

    ${isAdMob ? '// Google Mobile Ads (GMA) Next-Gen SDK (Latest Production Release)\n    implementation("com.google.android.gms:play-services-ads:24.0.0")' : ''}
    ${isStartIo ? '// Start.io In-App SDK 5.1.0\n    implementation("com.startapp:inapp-sdk:5.1.0")' : ''}
}`;
}

export function generateActivityMainXml(config?: AppConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000">

    <!-- Top Minimal Progress Bar for Web Loading -->
    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="3dp"
        android:indeterminate="false"
        android:max="100"
        android:progressDrawable="@drawable/progress_bar_drawable"
        app:layout_constraintTop_toTopOf="parent" />

    <!-- Fullscreen WebView -->
    <WebView
        android:id="@+id/webView"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintTop_toBottomOf="@id/progressBar"
        app:layout_constraintBottom_toTopOf="@id/adContainer"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Center Circular Progress Wheel (Shows during page loading, disappears when loaded) -->
    <ProgressBar
        android:id="@+id/loadingSpinner"
        android:layout_width="54dp"
        android:layout_height="54dp"
        android:indeterminate="true"
        android:visibility="gone"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Bottom Ad Container (AdMob or Start.io) -->
    <FrameLayout
        android:id="@+id/adContainer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:minHeight="50dp"
        android:gravity="center"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>`;
}

export function generateActivitySplashXml(config: AppConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${config.splashBgColor}">

    <!-- Splash Screen Background Image -->
    <ImageView
        android:id="@+id/splashBg"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scaleType="centerCrop"
        android:src="@drawable/splash_bg" />

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:gravity="center"
        android:orientation="vertical">

        <!-- App Logo -->
        <ImageView
            android:id="@+id/appLogo"
            android:layout_width="110dp"
            android:layout_height="110dp"
            android:src="@mipmap/ic_launcher" />

        <!-- App Name -->
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="20dp"
            android:fontFamily="sans-serif-medium"
            android:text="${config.appName}"
            android:textColor="#FFFFFF"
            android:textSize="24sp" />

        <!-- Loading spinner -->
        <ProgressBar
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:layout_marginTop="32dp"
            android:indeterminate="true" />
    </LinearLayout>

</RelativeLayout>`;
}

export function generateThemesXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base application theme: Pure Fullscreen Immersive (No ActionBar, No Title) -->
    <style name="Theme.FullScreenApp" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="android:windowNoTitle">true</item>
        <item name="windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowTranslucentNavigation">true</item>
    </style>

    <style name="Theme.FullScreenApp.Splash" parent="Theme.FullScreenApp">
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>`;
}

export function generateAppConfigJson(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

export function generateFilePathsXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <external-files-path name="external_files_path" path="." />
    <files-path name="internal_files" path="." />
    <cache-path name="cache_files" path="." />
</paths>`;
}
