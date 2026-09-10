import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Layers,
  ShieldCheck,
  Sparkles,
  FileCheck,
  AlertTriangle,
  Play,
  Globe,
  ExternalLink,
  Share2,
  RefreshCw,
  FolderOpen,
  Github,
  FileArchive,
  CheckCircle,
  UploadCloud,
  Key,
  Settings,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Link,
  MessageCircle,
} from 'lucide-react';
import { AppConfig } from '../types';
import { buildDirectApkFile, buildDirectAabFile } from '../utils/apkBuilder';
import {
  downloadBlobOrFile,
  openInChromeCustomTabs,
  isInsideAndroidApp,
  shareFileOnMobile,
  canWebShareFiles,
  openDeviceDownloadsFolder,
  installApkIfSupported,
  createDownloadUrl,
  downloadViaCustomTabs,
  shareToWhatsApp,
  isPublicHttpUrl,
  blobToBase64,
} from '../utils/fileDownloader';
import { isAppAssetsOrHashUrl, getBackendBaseUrl } from '../utils/apiConfig';
import {
  getSavedGitHubConfig,
  saveGitHubConfig,
  uploadApkToGitHubRelease,
  uploadToFreeCloud,
  checkServerGitHubConfig,
  GitHubUploadResult,
  GitHubCredentials,
} from '../utils/githubUploader';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  initialFormat?: 'apk' | 'aab';
  onToast: (msg: string) => void;
  onOpenGitHubModal?: () => void;
  onDownloadZip?: () => void;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  config,
  initialFormat = 'apk',
  onToast,
  onOpenGitHubModal,
  onDownloadZip,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'apk' | 'aab'>(initialFormat);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatusText, setBuildStatusText] = useState('');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [builtFile, setBuiltFile] = useState<{
    blob: Blob;
    fileName: string;
    url: string;
    format: 'apk' | 'aab';
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const format: 'apk' | 'aab' = initialFormat === 'aab' ? 'aab' : 'apk';
      setSelectedFormat(format);
      handleStartBuild(format);
    } else {
      if (builtFile?.url) {
        URL.revokeObjectURL(builtFile.url);
      }
      setBuiltFile(null);
      setIsBuilding(false);
      setBuildProgress(0);
      setBuildError(null);
    }
  }, [isOpen, initialFormat]);

  const handleStartBuild = async (format: 'apk' | 'aab') => {
    setIsBuilding(true);
    setBuildError(null);
    setBuildProgress(5);
    setBuildStatusText('Starting APK build engine...');
    setSelectedFormat(format);

    try {
      let result: { blob: Blob; fileName: string };

      if (format === 'apk') {
        result = await buildDirectApkFile(config, (pct, msg) => {
          setBuildProgress(pct);
          setBuildStatusText(msg);
        });
      } else {
        result = await buildDirectAabFile(config, (pct, msg) => {
          setBuildProgress(pct);
          setBuildStatusText(msg);
        });
      }

      const fileUrl = URL.createObjectURL(result.blob);
      const built = {
        blob: result.blob,
        fileName: result.fileName,
        url: fileUrl,
        format,
      };
      setBuiltFile(built);
      setIsBuilding(false);

      // ⚡ AUTO 1-CLICK INSTANT DOWNLOAD ON COMPLETION!
      try {
        const mimeType =
          format === 'apk'
            ? 'application/vnd.android.package-archive'
            : 'application/octet-stream';
        await downloadBlobOrFile(result.blob, result.fileName, mimeType);
        onToast(
          format === 'apk'
            ? '✅ ১-ক্লিকে APK ফাইল ডাউনলোড শুরু হয়েছে! ফোনের Downloads ফোল্ডার চেক করুন।'
            : '✅ AAB ফাইল ডাউনলোড হয়েছে!'
        );
      } catch (dlErr) {
        console.warn('Auto download error, user can tap button:', dlErr);
      }
    } catch (error: any) {
      console.error('Build error:', error);
      setIsBuilding(false);
      setBuildError(error?.message || 'Failed to compile file. Please verify settings.');
      onToast('Failed to compile file. Please verify settings.');
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);
  const [preparingUrl, setPreparingUrl] = useState(false);

  // GitHub Release and Cloud Uploader States
  const [githubCreds, setGithubCreds] = useState<GitHubCredentials>(() => getSavedGitHubConfig());
  const [showGitHubConfig, setShowGitHubConfig] = useState(false);
  const [isUploadingGitHub, setIsUploadingGitHub] = useState(false);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [gitHubResult, setGitHubResult] = useState<GitHubUploadResult | null>(null);
  const [cloudResultUrl, setCloudResultUrl] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [serverRepo, setServerRepo] = useState('');

  // Check if GitHub is pre-configured on server
  useEffect(() => {
    checkServerGitHubConfig().then((res) => {
      setServerConfigured(res.configuredOnServer);
      if (res.serverRepo) {
        setServerRepo(res.serverRepo);
        if (!githubCreds.repo) {
          setGithubCreds((prev) => ({ ...prev, repo: res.serverRepo }));
        }
      }
    });
  }, []);

  // Automatically prepare the real HTTPS server download URL in the background
  useEffect(() => {
    if (!builtFile) {
      setServerDownloadUrl(null);
      setGitHubResult(null);
      setCloudResultUrl(null);
      return;
    }
    let isSubscribed = true;
    setPreparingUrl(true);
    const mime =
      builtFile.format === 'apk'
        ? 'application/vnd.android.package-archive'
        : 'application/octet-stream';

    createDownloadUrl(builtFile.blob, builtFile.fileName, mime)
      .then((url) => {
        if (isSubscribed) {
          setServerDownloadUrl(url);
        }
      })
      .catch((err) => {
        console.warn('Failed to prepare server download URL:', err);
      })
      .finally(() => {
        if (isSubscribed) setPreparingUrl(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [builtFile]);

  const handleSaveGitHubConfig = () => {
    saveGitHubConfig(githubCreds);
    setShowGitHubConfig(false);
    onToast('✅ GitHub তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
  };

  const handleUploadToGitHubAndDownload = async () => {
    if (!builtFile) return;
    if (!serverConfigured && (!githubCreds.token || !githubCreds.repo)) {
      setShowGitHubConfig(true);
      onToast('অনুগ্রহ করে আপনার GitHub Token এবং Repository নাম দিন।');
      return;
    }

    setIsUploadingGitHub(true);
    try {
      onToast('🚀 GitHub Release তৈরি হচ্ছে এবং ফাইল আপলোড হচ্ছে...');
      const res = await uploadApkToGitHubRelease(
        builtFile.blob,
        builtFile.fileName,
        githubCreds
      );
      setGitHubResult(res);
      onToast('✅ GitHub Release তৈরি সম্পন্ন! Custom Tab ডাউনলোড শুরু হচ্ছে...');
      openInChromeCustomTabs(res.downloadUrl);
    } catch (err: any) {
      console.error('GitHub Release Upload Failed:', err);
      onToast('GitHub আপলোড ব্যর্থ: ' + (err?.message || 'ত্রুটি'));
      setShowGitHubConfig(true);
    } finally {
      setIsUploadingGitHub(false);
    }
  };

  const handleFreeCloudUploadAndDownload = async () => {
    if (!builtFile) return;
    setIsUploadingCloud(true);
    try {
      onToast('⚡ ফ্রি ক্লাউড হোস্টে আপলোড হচ্ছে...');
      const res = await uploadToFreeCloud(builtFile.blob, builtFile.fileName);
      setCloudResultUrl(res.downloadUrl);
      onToast('✅ ক্লাউড আপলোড সম্পন্ন! Custom Tab ডাউনলোড শুরু হচ্ছে...');
      openInChromeCustomTabs(res.downloadUrl);
    } catch (err: any) {
      console.error('Free cloud upload error:', err);
      onToast('ক্লাউড আপলোড ব্যর্থ: ' + (err?.message || 'ত্রুটি'));
    } finally {
      setIsUploadingCloud(false);
    }
  };

  const handleTriggerDownload = async (e?: React.MouseEvent) => {
    if (e && isInsideAndroidApp()) {
      e.preventDefault();
    }
    if (!builtFile) return;
    setDownloading(true);
    try {
      const mimeType =
        builtFile.format === 'apk'
          ? 'application/vnd.android.package-archive'
          : 'application/octet-stream';

      const ok = await downloadBlobOrFile(builtFile.blob, builtFile.fileName, mimeType);
      if (ok) {
        onToast(
          builtFile.format === 'apk'
            ? '✅ APK ফাইল ডাউনলোড শুরু হয়েছে! ফোনের Notifications ও Download ফোল্ডার চেক করুন।'
            : '✅ AAB ডাউনলোড সম্পন্ন হয়েছে!'
        );
      }
    } catch (err) {
      console.error(err);
      if (serverDownloadUrl) {
        openInChromeCustomTabs(serverDownloadUrl);
        onToast('🚀 Custom Tabs-এ ডাউনলোড ওপেন করা হয়েছে।');
      } else {
        onToast('ডাউনলোড শুরু করতে "Custom Tab URL Download" বাটন চাপুন।');
      }
    } finally {
      setTimeout(() => setDownloading(false), 1200);
    }
  };

  const handleCustomTabDownload = async () => {
    if (!builtFile) return;
    setDownloading(true);

    // If running inside Android App, directly save to Downloads storage
    const androidBridge =
      typeof window !== 'undefined'
        ? (window as any).AndroidDownloader ||
          (window as any).AndroidApp ||
          (window as any).Android ||
          (window as any).JSBridge
        : null;

    if (androidBridge && typeof androidBridge.saveBase64File === 'function') {
      try {
        onToast('💾 ফাইলটি সরাসরি ডিভাইসে সেভ হচ্ছে...');
        const base64Data = await blobToBase64(builtFile.blob);
        const mimeType =
          builtFile.format === 'apk'
            ? 'application/vnd.android.package-archive'
            : 'application/octet-stream';
        androidBridge.saveBase64File(base64Data, builtFile.fileName, mimeType);
        onToast('✅ ফাইলটি আপনার ফোনের Download ফোল্ডারে সেভ হয়েছে!');
        setTimeout(() => setDownloading(false), 800);
        return;
      } catch (err) {
        console.warn('Native save failed, continuing to custom tab download:', err);
      }
    }

    try {
      const mimeType =
        builtFile.format === 'apk'
          ? 'application/vnd.android.package-archive'
          : 'application/octet-stream';
      let url = serverDownloadUrl;
      if (!url || isAppAssetsOrHashUrl(url)) {
        url = await createDownloadUrl(builtFile.blob, builtFile.fileName, mimeType);
        if (!isAppAssetsOrHashUrl(url)) {
          setServerDownloadUrl(url);
        }
      }
      if (url && !isAppAssetsOrHashUrl(url)) {
        openInChromeCustomTabs(url);
        onToast('🚀 Custom Tab দিয়ে ডাউনলোড শুরু হয়েছে! ফোনের Notifications ও Download ফোল্ডার চেক করুন।');
      } else {
        await downloadBlobOrFile(builtFile.blob, builtFile.fileName, mimeType, true);
      }
    } catch (err: any) {
      console.error('Custom tab download error:', err);
      onToast('ডাউনলোড প্রস্তুত করতে সমস্যা: ' + (err?.message || 'Error'));
    } finally {
      setTimeout(() => setDownloading(false), 1200);
    }
  };

  const handleMobileShare = async () => {
    if (!builtFile) return;
    setSharing(true);
    try {
      const mimeType =
        builtFile.format === 'apk'
          ? 'application/vnd.android.package-archive'
          : 'application/octet-stream';
      const shared = await shareFileOnMobile(builtFile.blob, builtFile.fileName, mimeType);
      if (shared) {
        onToast('✅ ফাইলটি সফলভাবে শেয়ার / সেভ করা হয়েছে!');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!builtFile) return;
    setSharing(true);
    try {
      const mimeType =
        builtFile.format === 'apk'
          ? 'application/vnd.android.package-archive'
          : 'application/octet-stream';
      const knownValidUrl =
        (isPublicHttpUrl(gitHubResult?.downloadUrl) && gitHubResult?.downloadUrl) ||
        (isPublicHttpUrl(serverDownloadUrl) && serverDownloadUrl) ||
        (isPublicHttpUrl(cloudResultUrl) && cloudResultUrl) ||
        undefined;

      const res = await shareToWhatsApp(
        builtFile.blob,
        builtFile.fileName,
        config.appName,
        mimeType,
        knownValidUrl
      );
      onToast(res.message);
    } catch (e: any) {
      console.warn('WhatsApp share error:', e);
      onToast('WhatsApp শেয়ারে সমস্যা হয়েছে');
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-900/90 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-lg font-bold text-white truncate">Direct Android App Download</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full shrink-0">
                  Direct File
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                সরাসরি .apk ফাইল ডাউনলোড করে মোবাইলে ইন্সটল করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 sm:p-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={isBuilding}
            onClick={() => handleStartBuild('apk')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition ${
              selectedFormat === 'apk'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            } disabled:opacity-50`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Direct APK (.apk)</span>
            <span className="hidden xs:inline-block text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">
              Mobile Install
            </span>
          </button>

          <button
            type="button"
            disabled={isBuilding}
            onClick={() => handleStartBuild('aab')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition ${
              selectedFormat === 'aab'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            } disabled:opacity-50`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>App Bundle (.aab)</span>
            <span className="hidden xs:inline-block text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">
              Play Store
            </span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {isBuilding ? (
            /* Build in Progress Animation */
            <div className="py-6 sm:py-8 px-2 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                  <Smartphone className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-emerald-500 border-t-transparent animate-spin" />
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-semibold text-white">
                  Building {selectedFormat.toUpperCase()} File...
                </h4>
                <p className="text-xs text-slate-400 mt-1">{buildStatusText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${buildProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {buildProgress}% Complete
              </span>
            </div>
          ) : buildError ? (
            /* Build Error Card */
            <div className="p-4 sm:p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>বিল্ড সম্পন্ন হতে সমস্যা হয়েছে (Build Error)</span>
              </div>
              <p className="text-xs text-rose-200 bg-black/30 p-2.5 rounded-lg font-mono break-all">
                {buildError}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartBuild(selectedFormat)}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>🔄 আবার চেষ্টা করুন (Retry Build)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openInChromeCustomTabs(getBackendBaseUrl())}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chrome এ খুলুন</span>
                </button>
              </div>
            </div>
          ) : builtFile ? (
            /* Build Finished Card */
            <div className="space-y-4 sm:space-y-5">
              {/* Ready Banner */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{builtFile.fileName}</h4>
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                        SIGNED
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                      Ready for direct download • Standalone {builtFile.format.toUpperCase()} binary
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  {/* Primary Download Button (uses Custom Tab URL download on Android app) */}
                  <button
                    type="button"
                    onClick={handleTriggerDownload}
                    disabled={downloading}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg active:scale-95 transition ${
                      downloading
                        ? 'opacity-80 bg-emerald-700'
                        : isInsideAndroidApp()
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                        : builtFile.format === 'apk'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                        : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/25'
                    }`}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>
                      {downloading
                        ? 'ডাউনলোড হচ্ছে...'
                        : isInsideAndroidApp()
                        ? 'Custom Tab দিয়ে Download'
                        : 'Download Now'}
                    </span>
                  </button>

                  {/* Dedicated Custom Tab URL Download Button */}
                  <button
                    type="button"
                    onClick={handleCustomTabDownload}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 active:scale-95 transition shadow-md"
                    title="Download directly through Chrome Custom Tabs via Real HTTPS URL"
                  >
                    <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Custom Tab Download</span>
                  </button>

                  {/* Open Device Downloads Folder */}
                  <button
                    type="button"
                    onClick={() => {
                      const opened = openDeviceDownloadsFolder();
                      if (!opened) {
                        onToast('আপনার ফোনের File Manager > Downloads ফোল্ডার চেক করুন');
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/40 active:scale-95 transition shadow-md"
                    title="Open your device Downloads folder"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>Downloads ফোল্ডার</span>
                  </button>

                  {/* In-App Direct Install if inside Native Android App */}
                  {isInsideAndroidApp() && builtFile.format === 'apk' && (
                    <button
                      type="button"
                      onClick={() => {
                        const initiated = installApkIfSupported(builtFile.fileName);
                        if (!initiated) {
                          onToast('ফাইলটি Downloads ফোল্ডার থেকে ওপেন করে ইনস্টল করুন');
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-amber-200 bg-amber-950/70 hover:bg-amber-900 border border-amber-600/40 active:scale-95 transition shadow-md"
                      title="Direct Install via Package Installer"
                    >
                      <Play className="w-4 h-4 text-amber-400" />
                      <span>সরাসরি ইনস্টল</span>
                    </button>
                  )}

                  {/* Web Share API on supported Mobile phones */}
                  {canWebShareFiles() && (
                    <button
                      type="button"
                      onClick={handleMobileShare}
                      disabled={sharing}
                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-purple-200 bg-purple-950/70 hover:bg-purple-900 border border-purple-600/40 active:scale-95 transition shadow-md"
                      title="Share file or install directly"
                    >
                      <Share2 className="w-4 h-4 text-purple-400" />
                      <span>{sharing ? 'শেয়ার হচ্ছে...' : 'মোবাইলে সেভ'}</span>
                    </button>
                  )}

                  {/* WhatsApp Direct Share Button */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    disabled={sharing}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-emerald-100 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/50 active:scale-95 transition shadow-md"
                    title="WhatsApp-এ ফাইল বা লিঙ্ক পাঠান"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-300" />
                    <span>WhatsApp-এ পাঠান</span>
                  </button>
                </div>
              </div>

              {/* Exact Storage Location Guide Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950/90 rounded-xl border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    ফোনে ফাইলের লোকেশন:{' '}
                    <strong className="text-white font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                      Internal Storage &gt; Download &gt; {builtFile.fileName}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openDeviceDownloadsFolder()}
                  className="text-emerald-400 hover:text-emerald-300 font-medium underline text-[11px] self-start sm:self-auto"
                >
                  ফোল্ডারে যান &rarr;
                </button>
              </div>

              {/* ⭐ GitHub Release & Custom Tabs Direct Download Engine ⭐ */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/50 rounded-2xl border border-purple-500/40 shadow-xl space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                      <Github className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>GitHub Release &amp; Custom Tabs ডাউনলোড</span>
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                          ✓ ১০০% গ্যারান্টিড ডাউনলোড
                        </span>
                        {serverConfigured && (
                          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                            ✓ রেডি ({serverRepo})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        ফাইলটি GitHub Releases-এ আপলোড হয়ে অফিশিয়াল হাই-স্পিড CDN তৈরি হবে এবং Chrome Custom Tabs সরাসরি ফোনে ডাউনলোড শুরু করবে।
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGitHubConfig(!showGitHubConfig)}
                    className="p-1.5 text-slate-400 hover:text-purple-300 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition shrink-0"
                    title="GitHub Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUploadToGitHubAndDownload}
                    disabled={isUploadingGitHub}
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/25 active:scale-95 transition disabled:opacity-60"
                  >
                    {isUploadingGitHub ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>GitHub-এ আপলোড ও Release তৈরি হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 shrink-0" />
                        <span>🚀 GitHub-এ আপলোড ও Custom Tab ডাউনলোড</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleFreeCloudUploadAndDownload}
                    disabled={isUploadingCloud}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-500/30 rounded-xl text-xs font-semibold active:scale-95 transition disabled:opacity-60 shrink-0"
                    title="টোকেন ছাড়া ১-ক্লিকে ক্লাউড আপলোড ও ডাউনলোড"
                  >
                    {isUploadingCloud ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>⚡ ১-ক্লিক ক্লাউড ডাউনলোড</span>
                      </>
                    )}
                  </button>
                </div>

                {/* GitHub Config Drawer / Form */}
                {showGitHubConfig && (
                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-purple-500/30 space-y-3 mt-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-purple-400" />
                        <span>GitHub একাউন্ট ও রিপোজিটরি সেটআপ</span>
                      </span>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Web+To+APK+Creator"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>GitHub Token বানান ↗</span>
                      </a>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          GitHub Personal Access Token (PAT):
                        </label>
                        <input
                          type="password"
                          value={githubCreds.token}
                          onChange={(e) => setGithubCreds({ ...githubCreds, token: e.target.value })}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          className="w-full bg-slate-950 text-white font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          টিপ: GitHub এর Settings &gt; Developer settings &gt; Personal access tokens থেকে 'repo' পারমিশন দিয়ে টোকেন তৈরি করুন।
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          GitHub Repository Name (owner/repo):
                        </label>
                        <input
                          type="text"
                          value={githubCreds.repo}
                          onChange={(e) => setGithubCreds({ ...githubCreds, repo: e.target.value })}
                          placeholder="your-username/your-repo (e.g. installapkapps/apk-builds)"
                          className="w-full bg-slate-950 text-white font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowGitHubConfig(false)}
                          className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg text-xs"
                        >
                          বন্ধ করুন
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveGitHubConfig}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow active:scale-95 transition"
                        >
                          সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Successful GitHub Upload Result Display */}
                {gitHubResult && (
                  <div className="p-3 bg-purple-950/50 border border-purple-500/40 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>GitHub Release সফল হয়েছে ({gitHubResult.tagName})</span>
                      </div>
                      <a
                        href={gitHubResult.releaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:text-purple-200 underline text-[11px] flex items-center gap-1"
                      >
                        <span>GitHub Release পেজ দেখুন ↗</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={gitHubResult.downloadUrl}
                        className="w-full bg-slate-900 text-purple-200 font-mono text-[11px] px-3 py-2 rounded-lg border border-purple-500/30 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(gitHubResult.downloadUrl);
                          onToast('✅ GitHub ডাউনলোড লিঙ্ক কপি করা হয়েছে!');
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition"
                      >
                        কপি করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => openInChromeCustomTabs(gitHubResult.downloadUrl)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-md active:scale-95 transition flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Custom Tab-এ ওপেন</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      🎉 এই লিংকটি GitHub-এর নিজস্ব সার্ভার থেকে আসছে। Custom Tab বাটন চাপলে আপনার ফোনের Google Chrome স্বয়ংক্রিয়ভাবে ডাউনলোড সম্পন্ন করবে।
                    </p>
                  </div>
                )}

                {/* Free Cloud Upload Result Display */}
                {cloudResultUrl && !gitHubResult && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-cyan-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>ক্লাউড ডাউনলোড প্রস্তুত:</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-normal">সরাসরি লিঙ্ক</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={cloudResultUrl}
                        className="w-full bg-slate-900 text-cyan-200 font-mono text-[11px] px-3 py-2 rounded-lg border border-cyan-500/30 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cloudResultUrl);
                          onToast('✅ ক্লাউড ডাউনলোড লিঙ্ক কপি করা হয়েছে!');
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition"
                      >
                        কপি করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => openInChromeCustomTabs(cloudResultUrl)}
                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-md active:scale-95 transition flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Custom Tab-এ ওপেন</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Real HTTPS Download URL Bar (Custom Tab & Browser Download) */}
              {serverDownloadUrl && (
                <div className="p-3 bg-slate-950/90 rounded-xl border border-cyan-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                      <Globe className="w-4 h-4 shrink-0" />
                      <span>সরাসরি ডাউনলোড URL (Custom Tab / Chrome):</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                      ✓ Android Download Manager সাপোর্টেড
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={serverDownloadUrl}
                      className="w-full bg-slate-900 text-slate-300 font-mono text-[11px] px-3 py-2 rounded-lg border border-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(serverDownloadUrl);
                        onToast('✅ ডাউনলোড লিঙ্ক কপি করা হয়েছে!');
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold whitespace-nowrap active:scale-95 transition"
                    >
                      কপি করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => openInChromeCustomTabs(serverDownloadUrl)}
                      className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition shadow-sm"
                    >
                      Custom Tab-এ ওপেন
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 এই লিঙ্কে ক্লিক করলে আপনার ফোনের Google Chrome / Custom Tabs ওপেন হবে এবং Android এর সিস্টেম ডাউনলোড ইঞ্জিন ফাইলটি সরাসরি <strong className="text-slate-200">Downloads ফোল্ডারে</strong> সেভ করবে।
                  </p>
                </div>
              )}

              {/* Instant Direct Download Link Fallback */}
              <div className="flex items-center justify-between px-2 text-xs">
                <span className="text-slate-400 text-[11px]">বিকল্প ডাউনলোড পদ্ধতি:</span>
                <a
                  href={serverDownloadUrl || builtFile.url}
                  download={builtFile.fileName}
                  className="text-emerald-400 hover:text-emerald-300 font-medium underline text-[11px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>সরাসরি ব্রাউজার ডাউনলোড লিঙ্ক (Direct Link)</span>
                </a>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 sm:p-3 bg-slate-950/60 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                  <span className="text-slate-400 block text-[10px] sm:text-[11px]">App Name</span>
                  <span className="font-semibold text-white truncate block mt-0.5">
                    {config.appName}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-950/60 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                  <span className="text-slate-400 block text-[10px] sm:text-[11px]">Package</span>
                  <span className="font-semibold text-emerald-400 truncate block mt-0.5 font-mono">
                    {config.packageName}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-950/60 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                  <span className="text-slate-400 block text-[10px] sm:text-[11px]">Screen Mode</span>
                  <span className="font-semibold text-cyan-400 block mt-0.5 truncate">
                    100% Fullscreen
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-950/60 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                  <span className="text-slate-400 block text-[10px] sm:text-[11px]">Live Ads</span>
                  <span className="font-semibold text-amber-400 block mt-0.5 uppercase truncate">
                    {config.adNetwork === 'none' ? 'Disabled' : `${config.adNetwork} (Real)`}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-950/60 rounded-xl border border-slate-800 col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
                  <span className="text-slate-400 block text-[10px] sm:text-[11px]">Signing Key</span>
                  <span className="font-semibold text-purple-400 truncate block mt-0.5">
                    {config.keystore?.useCustomKeystore
                      ? (config.keystore.keystoreFileName || 'Custom .JKS')
                      : 'Auto Release'}
                  </span>
                </div>
              </div>

              {/* Bengali & English Installation Guide & Parse Error Explanation */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>মোবাইলে কিভাবে সরাসরি ইন্সটল করবেন (How to Install):</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 pl-5 list-disc marker:text-emerald-500">
                  <li>
                    <strong>ডাউনলোড করুন:</strong> উপরের সবুজ{' '}
                    <strong className="text-white font-mono">"Download Now"</strong> বাটনে ক্লিক করলে
                    সরাসরি <span className="text-emerald-400 font-mono">.apk</span> ফাইলটি আপনার ফোনের{' '}
                    <code className="bg-slate-800 px-1 rounded text-cyan-300">Downloads</code> ফোল্ডারে সেভ হবে।
                  </li>
                  <li>
                    <strong>ওপেন করুন:</strong> ডাউনলোড শেষ হলে আপনার ফোনের Notification Bar বা File
                    Manager এর Downloads ফোল্ডার থেকে ফাইলটিতে ক্লিক করুন।
                  </li>
                  <li>
                    <strong>পারমিশন:</strong> যদি প্রম্পট আসে{' '}
                    <span className="text-amber-400">"Install unknown apps"</span>, তবে ব্রাউজার বা
                    ফাইল ম্যানেজারকে <span className="text-emerald-400">"Allow"</span> দিন এবং{' '}
                    <strong>Install</strong> চাপুন।
                  </li>
                  <li>
                    <strong>রিয়েল অ্যাডস ও ফুলস্ক্রিন:</strong> কোনো টেস্ট অ্যাড ছাড়াই রিয়েল বিজ্ঞাপন কনফিগারেশনসহ সম্পূর্ণ মোবাইল স্ক্রিন জুড়ে ওয়েবসাইটটি লাইভ চলবে!
                  </li>
                </ul>

                {/* Important Notice for "There was a problem while parsing the package" */}
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-[12px]">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>"There was a problem while parsing the package" কেন আসে ও ১০০% সমাধান:</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    ১. <strong>স্বয়ংক্রিয় রিডাইরেক্ট বন্ধ করা হয়েছে:</strong> পূর্বে ডাউনলোড শেষ হওয়ামাত্র কোডটি স্বয়ংক্রিয়ভাবে প্যাকেজ ইনস্টলারে রিডাইরেক্ট করে দিচ্ছিল, যা এখন বন্ধ করা হয়েছে।<br />
                    ২. <strong>.AAB সরাসরি ফোনে চলে না:</strong> <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-300 font-mono">.aab</code> ফাইল শুধুমাত্র গুগল প্লে-স্টোরের জন্য, এটি সরাসরি কোনো মোবাইলে ইনস্টল করা যায় না।<br />
                    ৩. <strong>আসল ইনস্টলেবল APK (১০০% গ্যারান্টিযুক্ত):</strong> ফোনে যে কোনো APK ইনস্টল করার জন্য অফিশিয়াল Android SDK (aapt2, d8 bytecode compiler) দ্বারা কম্পাইল হওয়া প্রয়োজন। এটি আপনি নিচের ২টি উপায়ে বিনামূল্যে সেকেন্ডের মধ্যে পেতে পারেন:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onOpenGitHubModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenGitHubModal();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold shadow transition active:scale-95"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>⚡ GitHub Actions অটো ক্লাউড বিল্ড (অফিশিয়াল APK)</span>
                      </button>
                    )}
                    {onDownloadZip && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onDownloadZip();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition"
                      >
                        <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
                        <span>📦 প্রজেক্ট সোর্স কোড ZIP (Android Studio)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Initial Ready to Build Card */
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {selectedFormat.toUpperCase()} ফাইল তৈরি করতে প্রস্তুত
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  নিচের বাটনে ক্লিক করে সরাসরি ১-ক্লিকে {selectedFormat.toUpperCase()} ফাইল তৈরি ও ডাউনলোড শুরু করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleStartBuild(selectedFormat)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>⚡ ১-ক্লিকে {selectedFormat.toUpperCase()} তৈরি ও ডাউনলোড</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pure Fullscreen Immersive Mode is automatically enabled</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Close
            </button>
            {builtFile && (
              <a
                href={builtFile.url}
                download={builtFile.fileName}
                onClick={handleTriggerDownload}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
                  builtFile.format === 'apk'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save {builtFile.fileName}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
