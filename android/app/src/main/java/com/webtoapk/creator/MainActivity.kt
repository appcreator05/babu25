package com.webtoapk.creator

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            initApp()
        } catch (e: Throwable) {
            Toast.makeText(this, "Starting APK Creator: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initApp() {
        // Hide default action bar safely
        supportActionBar?.hide()

        // Enable full-screen immersive experience
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } catch (e: Exception) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }

        webView = WebView(this)
        setContentView(webView)

        setupWebViewSettings()
        setupDownloadListener()

        // Secure WebViewAssetLoader: enables ES modules, CORS, and local storage without crashes
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                if (url.startsWith("https://appassets.androidplatform.net") ||
                    url.startsWith("http://") ||
                    url.startsWith("https://")
                ) {
                    return false
                }
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    // Ignore unsupported schemes
                }
                return true
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // If local assets fail to load, automatically fall back to live cloud URL
                if (request?.isForMainFrame == true && request.url.toString().contains("appassets.androidplatform.net")) {
                    webView.post {
                        webView.loadUrl("https://ais-pre-gxyvg3phkakhlvxkyoqcx7-32286104148.asia-southeast1.run.app")
                    }
                }
            }
        }

        // Test if bundled web assets exist
        val hasLocalAssets = try {
            assets.open("web/index.html").close()
            true
        } catch (e: Exception) {
            false
        }

        if (hasLocalAssets) {
            webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
        } else {
            webView.loadUrl("https://ais-pre-gxyvg3phkakhlvxkyoqcx7-32286104148.asia-southeast1.run.app")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = false
        settings.loadWithOverviewMode = true
        settings.textZoom = 100
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Register Native Android Bridge for Direct Downloads and Custom Tabs
        val bridge = AndroidBridge()
        webView.addJavascriptInterface(bridge, "AndroidDownloader")
        webView.addJavascriptInterface(bridge, "AndroidApp")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                }
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }
    }

    private fun setupDownloadListener() {
        webView.setDownloadListener { url, _, contentDisposition, mimetype, _ ->
            if (url.startsWith("data:")) {
                handleDataUrlDownload(url, contentDisposition, mimetype)
            } else if (url.startsWith("blob:")) {
                // Fetch blob inside WebView JS context and pass base64 to native bridge
                val js = """
                    (async function() {
                        try {
                            const res = await fetch('$url');
                            const blob = await res.blob();
                            const reader = new FileReader();
                            reader.onloadend = function() {
                                if (window.AndroidDownloader) {
                                    window.AndroidDownloader.saveBase64File(
                                        reader.result,
                                        'apk-creator-app.apk',
                                        blob.type || 'application/vnd.android.package-archive'
                                    );
                                }
                            };
                            reader.readAsDataURL(blob);
                        } catch(err) {
                            console.error('Blob conversion failed', err);
                        }
                    })();
                """.trimIndent()
                webView.evaluateJavascript(js, null)
            } else {
                try {
                    val request = DownloadManager.Request(Uri.parse(url)).apply {
                        setMimeType(mimetype)
                        setDescription("Downloading via APK Creator...")
                        setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype))
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS,
                            URLUtil.guessFileName(url, contentDisposition, mimetype)
                        )
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)
                    Toast.makeText(this, "Download started...", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    // Fallback to Chrome Custom Tabs
                    openCustomTab(url)
                }
            }
        }
    }

    /**
     * Opens Chrome Custom Tabs with modern app toolbar styling
     */
    fun openCustomTab(url: String) {
        try {
            val primaryColor = resources.getColor(R.color.primary, theme)
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .setDefaultColorSchemeParams(
                    CustomTabColorSchemeParams.Builder()
                        .setToolbarColor(primaryColor)
                        .setNavigationBarColor(primaryColor)
                        .build()
                )
                .build()
            customTabsIntent.launchUrl(this, Uri.parse(url))
        } catch (e: Exception) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(intent)
            } catch (err: Exception) {
                Toast.makeText(this, "Cannot open browser: ${err.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Saves raw bytes into the public Downloads directory on all Android versions
     */
    fun saveBytesToDownloads(fileBytes: ByteArray, requestedFileName: String, mimeType: String): File? {
        val fileName = if (requestedFileName.isNotBlank()) requestedFileName else "apk-creator-app.apk"
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

                // Scan file so it shows up in media store and all file managers
                MediaScannerConnection.scanFile(
                    this,
                    arrayOf(targetFile.absolutePath),
                    arrayOf(mimeType),
                    null
                )

                // Register with system DownloadManager so it appears in notification & Downloads app
                try {
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                    dm?.addCompletedDownload(
                        fileName,
                        "Downloaded by APK Creator",
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
                // Delete previous file with same name to avoid collisions
                try {
                    resolver.delete(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        "${MediaStore.MediaColumns.DISPLAY_NAME} = ?",
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

        // 3. Fallback app-private cache directory for FileProvider
        val fallbackFile = try {
            val fallbackDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
            val file = File(fallbackDir, fileName)
            FileOutputStream(file).use { it.write(fileBytes) }
            file
        } catch (e: Exception) {
            null
        }

        return resultFile ?: fallbackFile
    }

    /**
     * Prompts the native Android Package Installer to install the generated APK
     */
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
            val uri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                file
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Saved to Downloads: ${file.name}", Toast.LENGTH_LONG).show()
        }
    }

    private fun handleDataUrlDownload(dataUrl: String, contentDisposition: String, mimetype: String) {
        try {
            val commaIndex = dataUrl.indexOf(",")
            if (commaIndex != -1) {
                val base64Data = dataUrl.substring(commaIndex + 1)
                val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                var fileName = URLUtil.guessFileName(dataUrl, contentDisposition, mimetype)
                if (fileName.isNullOrBlank() || fileName == "downloadfile.bin") {
                    fileName = "my_web_app-release.apk"
                }
                val targetMime = if (mimetype.isNotBlank() && mimetype != "application/octet-stream") mimetype else "application/vnd.android.package-archive"
                val savedFile = saveBytesToDownloads(decodedBytes, fileName, targetMime)
                if (savedFile != null) {
                    Toast.makeText(this, "Downloaded to Downloads: $fileName", Toast.LENGTH_LONG).show()
                    if (fileName.endsWith(".apk", ignoreCase = true)) {
                        promptInstallApk(savedFile)
                    }
                }
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Download error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    /**
     * JavaScript interface exposed to the Web App running inside WebView
     */
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
                            Toast.makeText(
                                this@MainActivity,
                                "✅ Downloaded to Downloads folder: $fileName",
                                Toast.LENGTH_LONG
                            ).show()
                        } else {
                            Toast.makeText(this@MainActivity, "Failed to save: $fileName", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Save error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
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
                    Toast.makeText(this@MainActivity, "Install error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun openInCustomTabs(url: String) {
            runOnUiThread {
                val targetUrl = if (url.isNotBlank()) url else "https://ais-pre-gxyvg3phkakhlvxkyoqcx7-32286104148.asia-southeast1.run.app"
                openCustomTab(targetUrl)
            }
        }

        @JavascriptInterface
        fun downloadUrl(url: String) {
            runOnUiThread {
                if (url.isNotBlank()) {
                    openCustomTab(url)
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
                            "ফাইলটি আপনার ফোনের Internal Storage > Download ফোল্ডারে আছে",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return true
        }
    }
}
