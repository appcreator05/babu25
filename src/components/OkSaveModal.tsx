import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  ArrowRight,
  FolderOpen,
  FolderDown,
  Github,
  Download,
  ShieldCheck,
  RefreshCw,
  MessageCircle,
  HardDrive,
  Share2,
  Check,
} from 'lucide-react';
import { AppConfig } from '../types';
import { buildDirectApkFile, buildDirectAabFile } from '../utils/apkBuilder';
import {
  uploadBothPackages,
  DualBuildUploadResult,
  getSavedGitHubConfig,
  checkServerGitHubConfig,
} from '../utils/githubUploader';
import {
  openInChromeCustomTabs,
  downloadBlobOrFile,
  saveFileToDeviceFolder,
  shareToWhatsApp,
  saveToGoogleDrive,
  shareFileOnMobile,
  createDownloadUrl,
  openDeviceDownloadsFolder,
  isPublicHttpUrl,
} from '../utils/fileDownloader';

interface OkSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onToast: (msg: string) => void;
}

export const OkSaveModal: React.FC<OkSaveModalProps> = ({
  isOpen,
  onClose,
  config,
  onToast,
}) => {
  const [stage, setStage] = useState<'loading' | 'completed' | 'error'>('loading');
  const [progressPercent, setProgressPercent] = useState(10);
  const [progressStatus, setProgressStatus] = useState('অ্যাপ বিল্ড প্রস্তুত হচ্ছে...');
  const [buildResult, setBuildResult] = useState<DualBuildUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasServerGithub, setHasServerGithub] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Store compiled package blobs for 100% resilient offline / native download
  const [apkPackage, setApkPackage] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [aabPackage, setAabPackage] = useState<{ blob: Blob; fileName: string } | null>(null);

  // Sharing & Saving states
  const [activeTab, setActiveTab] = useState<'apk' | 'aab'>('apk');
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStage('loading');
      setProgressPercent(10);
      setProgressStatus('অ্যাপ বিল্ড প্রস্তুত হচ্ছে...');
      setBuildResult(null);
      setErrorMessage(null);
      setApkPackage(null);
      setAabPackage(null);
      return;
    }

    let isMounted = true;

    async function runBuildAndUpload() {
      try {
        setStage('loading');
        setErrorMessage(null);
        setProgressPercent(10);
        setProgressStatus('অ্যাপ প্যাকেজ প্রস্তুতি শুরু হচ্ছে...');

        // Check server github config
        const serverConfig = await checkServerGitHubConfig();
        if (isMounted) setHasServerGithub(serverConfig.configuredOnServer);

        // 1. Build Direct APK
        if (!isMounted) return;
        setProgressPercent(15);
        setProgressStatus('১/৩: স্ট্যান্ডঅ্যালোন APK (.apk) তৈরি হচ্ছে...');
        const apk = await buildDirectApkFile(config, (percent, status) => {
          if (isMounted) {
            setProgressPercent(Math.min(45, Math.max(15, Math.round(percent * 0.45))));
            setProgressStatus(`১/৩ APK বিল্ড: ${status}`);
          }
        });
        if (isMounted) setApkPackage(apk);

        // 2. Build Direct AAB
        if (!isMounted) return;
        setProgressPercent(50);
        setProgressStatus('২/৩: গুগল প্লে স্টোর AAB (.aab) তৈরি হচ্ছে...');
        const aab = await buildDirectAabFile(config, (percent, status) => {
          if (isMounted) {
            setProgressPercent(Math.min(80, Math.max(50, Math.round(50 + percent * 0.3))));
            setProgressStatus(`২/৩ AAB বিল্ড: ${status}`);
          }
        });
        if (isMounted) setAabPackage(aab);

        // 3. Upload to GitHub Releases (or fast server/cloud fallback)
        if (!isMounted) return;
        setProgressPercent(85);
        setProgressStatus('৩/৩: ডাউনলোড লিঙ্ক ও প্যাকেজ প্রস্তুত হচ্ছে...');

        const result = await uploadBothPackages(apk, aab, undefined, (status) => {
          if (isMounted) {
            setProgressStatus(`৩/৩: ${status}`);
          }
        });

        if (!isMounted) return;
        setProgressPercent(100);
        setProgressStatus('সম্পূর্ণ হয়েছে!');
        setBuildResult(result);
        setStage('completed');
        onToast('🎉 অ্যাপ সফলভাবে তৈরি ও প্রস্তুত হয়েছে!');
      } catch (err: any) {
        console.error('Build & Upload failed:', err);
        if (isMounted) {
          setErrorMessage(err?.message || 'অ্যাপ তৈরি বা আপলোডে সমস্যা হয়েছে।');
          setStage('error');
        }
      }
    }

    runBuildAndUpload();

    return () => {
      isMounted = false;
    };
  }, [isOpen, attemptCount]);

  if (!isOpen) return null;

  const handleRetry = () => {
    setAttemptCount((prev) => prev + 1);
  };

  const getActivePackageInfo = () => {
    if (activeTab === 'apk') {
      return {
        pkg: apkPackage,
        fileName: buildResult?.apk.fileName || apkPackage?.fileName || `${config.appName.toLowerCase()}.apk`,
        downloadUrl: buildResult?.apk.downloadUrl || '',
        mimeType: 'application/vnd.android.package-archive',
        label: 'APK (.apk)',
      };
    }
    return {
      pkg: aabPackage,
      fileName: buildResult?.aab?.fileName || aabPackage?.fileName || `${config.appName.toLowerCase()}.aab`,
      downloadUrl: buildResult?.aab?.downloadUrl || '',
      mimeType: 'application/octet-stream',
      label: 'AAB (.aab)',
    };
  };

  // WhatsApp Share Action
  const handleWhatsAppShare = async () => {
    const { pkg, fileName, downloadUrl, mimeType } = getActivePackageInfo();
    setIsSharing(true);
    try {
      if (pkg?.blob) {
        const res = await shareToWhatsApp(
          pkg.blob,
          fileName,
          config.appName,
          mimeType,
          isPublicHttpUrl(downloadUrl) ? downloadUrl : undefined
        );
        onToast(res.message);
      } else if (downloadUrl && isPublicHttpUrl(downloadUrl)) {
        const msg = `🚀 *${config.appName}* Android App তৈরি সম্পন্ন!\n\n📦 ফাইল: *${fileName}*\n📥 সরাসরি ডাউনলোড লিংক:\n${downloadUrl}\n\n👆 ক্লিক করে ফোনে ডাউনলোড ও ইনস্টল করুন!`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
        onToast('💬 WhatsApp ওপেন হয়েছে!');
      } else {
        onToast('ফাইলটি প্রস্তুত হতে কিছুক্ষণ অপেক্ষা করুন');
      }
    } catch (err: any) {
      console.error('WhatsApp share error:', err);
      onToast('WhatsApp শেয়ারে সমস্যা হয়েছে');
    } finally {
      setIsSharing(false);
    }
  };

  // Save to Device Folder (File System Access) Action
  const handleSaveToFolder = async () => {
    const { pkg, fileName, mimeType } = getActivePackageInfo();
    if (!pkg?.blob) return;
    setIsSavingFolder(true);
    try {
      const res = await saveFileToDeviceFolder(pkg.blob, fileName, mimeType);
      if (res.success) {
        if (res.method === 'picker') {
          onToast('✅ ফোল্ডারে ফাইলটি সফলভাবে সেভ হয়েছে!');
        } else {
          onToast('✅ ফাইলটি ডাউনলোড শুরু হয়েছে!');
        }
      } else if (res.error !== 'User cancelled folder selection') {
        onToast('ফাইল সেভ ত্রুটি: ' + (res.error || 'ত্রুটি'));
      }
    } catch (err: any) {
      console.error('Save to folder error:', err);
      onToast('ফোল্ডারে সেভ ব্যর্থ: ' + (err?.message || 'Error'));
    } finally {
      setIsSavingFolder(false);
    }
  };

  // Google Drive Save Action
  const handleGoogleDriveSave = async () => {
    const { pkg, fileName, downloadUrl, mimeType } = getActivePackageInfo();
    if (!pkg?.blob) {
      window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
      return;
    }
    setIsSavingDrive(true);
    try {
      const shared = await saveToGoogleDrive(pkg.blob, fileName, mimeType, downloadUrl || undefined);
      if (shared) {
        onToast('✅ Google Drive বা অ্যাপে শেয়ার সম্পন্ন!');
      } else {
        onToast('🌐 Google Drive ওপেন হয়েছে। ফাইলটি আপলোড করুন।');
      }
    } catch (err: any) {
      console.error('Drive save error:', err);
      onToast('Google Drive ত্রুটি: ' + (err?.message || 'Error'));
    } finally {
      setIsSavingDrive(false);
    }
  };

  // Mobile System Share Sheet Action
  const handleMobileShare = async () => {
    const { pkg, fileName, downloadUrl, mimeType } = getActivePackageInfo();
    if (!pkg?.blob) return;
    setIsSharing(true);
    try {
      const shared = await shareFileOnMobile(pkg.blob, fileName, mimeType, downloadUrl || undefined);
      if (shared) {
        onToast('✅ ফাইলটি সফলভাবে শেয়ার / সেভ করা হয়েছে!');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSharing(false);
    }
  };

  // Direct Download Action
  const handleDirectDownload = async () => {
    const { pkg, fileName, downloadUrl, mimeType } = getActivePackageInfo();
    setDownloading(true);
    try {
      if (pkg?.blob) {
        await downloadBlobOrFile(pkg.blob, fileName, mimeType, true);
        onToast(`📥 ${fileName} ডাউনলোড শুরু হয়েছে!`);
      } else if (downloadUrl) {
        openInChromeCustomTabs(downloadUrl);
        onToast(`📥 ${fileName} ডাউনলোড শুরু হয়েছে!`);
      } else {
        onToast('ডাউনলোড ফাইল প্রস্তুত হচ্ছে...');
      }
    } catch (err) {
      console.error('Download error:', err);
      if (downloadUrl) {
        openInChromeCustomTabs(downloadUrl);
      }
    } finally {
      setTimeout(() => setDownloading(false), 1200);
    }
  };

  const handleDownloadApkInCustomTab = async (e?: React.MouseEvent) => {
    if (!buildResult?.apk) return;
    onToast('🚀 Custom Tab ওপেন হচ্ছে এবং APK ডাউনলোড শুরু হচ্ছে...');

    let url = buildResult.apk.downloadUrl;
    if (!url && apkPackage?.blob) {
      try {
        url = await createDownloadUrl(apkPackage.blob, buildResult.apk.fileName, 'application/vnd.android.package-archive');
        setBuildResult(prev => prev ? { ...prev, apk: { ...prev.apk, downloadUrl: url } } : prev);
      } catch (_) {}
    }

    if (url) {
      openInChromeCustomTabs(url);
    } else if (apkPackage?.blob) {
      await downloadBlobOrFile(
        apkPackage.blob,
        buildResult.apk.fileName,
        'application/vnd.android.package-archive',
        true
      );
    }
  };

  const handleDownloadAabInCustomTab = async (e?: React.MouseEvent) => {
    if (!buildResult?.aab) return;
    onToast('📦 Custom Tab ওপেন হচ্ছে এবং AAB ডাউনলোড শুরু হচ্ছে...');

    let url = buildResult.aab.downloadUrl;
    if (!url && aabPackage?.blob) {
      try {
        url = await createDownloadUrl(aabPackage.blob, buildResult.aab.fileName, 'application/octet-stream');
        setBuildResult(prev => prev ? { ...prev, aab: prev.aab ? { ...prev.aab, downloadUrl: url } : null } : prev);
      } catch (_) {}
    }

    if (url) {
      openInChromeCustomTabs(url);
    } else if (aabPackage?.blob) {
      await downloadBlobOrFile(
        aabPackage.blob,
        buildResult.aab.fileName,
        'application/octet-stream',
        true
      );
    }
  };

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    onToast(`✅ ${label} লিঙ্ক কপি করা হয়েছে!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {stage === 'loading'
                  ? 'অ্যাপ তৈরি ও GitHub-এ আপলোড হচ্ছে...'
                  : stage === 'completed'
                  ? '🎉 আপনার অ্যাপ সফলভাবে রেডি!'
                  : 'বিল্ড ত্রুটি'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {config.appName} ({config.packageName})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {/* ================= STAGE 1: LOADING SPRING / SPINNER ================= */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6 text-center">
              {/* Centered Glowing Loading Spring */}
              <div className="relative flex items-center justify-center">
                {/* Pulsating outer aura */}
                <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500/20 via-purple-500/20 to-teal-500/20 animate-ping opacity-60" />
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 blur-md animate-pulse" />

                {/* Spinning dual spring rings */}
                <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-emerald-400 border-r-teal-400 animate-spin flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-b-purple-400 animate-spin" />
                </div>

                {/* Center App Icon */}
                <div className="absolute w-10 h-10 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner border border-slate-700">
                  {config.appLogoUrl ? (
                    <img
                      src={config.appLogoUrl}
                      alt="App Icon"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Progress & Live Message */}
              <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-xs px-1 font-semibold">
                  <span className="text-emerald-400 animate-pulse flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{progressStatus}</span>
                  </span>
                  <span className="font-mono text-slate-300">{progressPercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-purple-500 rounded-full transition-all duration-300 shadow"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  অনুগ্রহ করে অপেক্ষা করুন — আপনার অ্যাপের বাইনারি ফাইলগুলো স্বয়ংক্রিয়ভাবে তৈরি হয়ে GitHub রিলিজ ও ক্লাউডে আপলোড হচ্ছে...
                </p>
              </div>

              {/* Steps Checklist */}
              <div className="w-full max-w-sm grid grid-cols-3 gap-2 text-[11px] pt-2">
                <div
                  className={`p-2 rounded-lg border text-center transition ${
                    progressPercent >= 40
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">১. APK ফাইল</div>
                  <div className="text-[10px]">{progressPercent >= 40 ? '✓ তৈরি শেষ' : 'তৈরি হচ্ছে...'}</div>
                </div>

                <div
                  className={`p-2 rounded-lg border text-center transition ${
                    progressPercent >= 75
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">২. AAB বান্ডেল</div>
                  <div className="text-[10px]">{progressPercent >= 75 ? '✓ তৈরি শেষ' : 'তৈরি হচ্ছে...'}</div>
                </div>

                <div
                  className={`p-2 rounded-lg border text-center transition ${
                    progressPercent >= 100
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">৩. GitHub আপলোড</div>
                  <div className="text-[10px]">{progressPercent >= 100 ? '✓ সফল' : 'আপলোড হচ্ছে...'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STAGE 2: DOWNLOAD APK & DOWNLOAD AAB + SHARE & SAVE SUITE ================= */}
          {stage === 'completed' && buildResult && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Success Badge Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-purple-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                      <span>অ্যাপ তৈরি ও ক্লাউড সিঙ্ক সম্পন্ন!</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      নিচে সরাসরি ফোনে সেভ করুন, <strong>WhatsApp</strong>-এ শেয়ার করুন বা <strong>Google Drive</strong>-এ রাখুন।
                    </p>
                  </div>
                </div>

                {buildResult.source === 'github' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2.5 py-1 rounded-full shrink-0">
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub CDN</span>
                  </span>
                )}
              </div>

              {/* Format Tab Selector (APK vs AAB) */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('apk')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'apk'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>APK প্যাকেজ (.apk)</span>
                  <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(মোবাইল ইনস্টল)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('aab')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'aab'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>AAB বান্ডেল (.aab)</span>
                  <span className="text-[10px] opacity-80 font-normal hidden sm:inline">(প্লে স্টোর)</span>
                </button>
              </div>

              {/* Active Package Details & Action Box */}
              {(() => {
                const info = getActivePackageInfo();
                return (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                          activeTab === 'apk'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {info.label}
                        </span>
                        <span className="text-xs text-slate-300 font-mono truncate max-w-[200px] sm:max-w-xs" title={info.fileName}>
                          {info.fileName}
                        </span>
                      </div>

                      {info.downloadUrl && isPublicHttpUrl(info.downloadUrl) && (
                        <button
                          type="button"
                          onClick={() => copyUrl(info.downloadUrl, `${info.label} লিংক`)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
                          title="ডাউনলোড লিংক কপি করুন"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                        </button>
                      )}
                    </div>

                    {/* ⭐ THE 4 PRIMARY SHARE & SAVE BUTTONS ⭐ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 1. WhatsApp Share */}
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        disabled={isSharing}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/40 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-200" />
                        <span>WhatsApp-এ পাঠান</span>
                      </button>

                      {/* 2. Save to Device Folder */}
                      <button
                        type="button"
                        onClick={handleSaveToFolder}
                        disabled={isSavingFolder}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <FolderDown className="w-4 h-4 text-teal-400" />
                        <span>{isSavingFolder ? 'সেভ হচ্ছে...' : 'পছন্দের ফোল্ডারে সেভ'}</span>
                      </button>

                      {/* 3. Google Drive Save */}
                      <button
                        type="button"
                        onClick={handleGoogleDriveSave}
                        disabled={isSavingDrive}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-900/60 hover:bg-blue-800/80 border border-blue-600/40 text-blue-100 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <HardDrive className="w-4 h-4 text-blue-300" />
                        <span>Google Drive-এ সেভ</span>
                      </button>

                      {/* 4. Native Mobile Share Sheet */}
                      <button
                        type="button"
                        onClick={handleMobileShare}
                        disabled={isSharing}
                        className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-600/40 text-purple-100 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Share2 className="w-4 h-4 text-purple-300" />
                        <span>মোবাইল শেয়ার শিট</span>
                      </button>
                    </div>

                    {/* Direct Uploaded Download URL Box with Copy & Open */}
                    {info.downloadUrl && (
                      <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            <span>সরাসরি ডাউনলোড লিঙ্ক ({activeTab.toUpperCase()} Uploaded):</span>
                          </span>
                          <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            অনলাইন লিংক রেডি
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={info.downloadUrl}
                            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-2 text-[11px] text-slate-200 font-mono select-all outline-none"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            type="button"
                            onClick={() => copyUrl(info.downloadUrl, `${activeTab.toUpperCase()} লিঙ্ক`)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                            title="লিংক কপি করুন"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{copiedLink ? 'কপি হয়েছে' : 'কপি'}</span>
                          </button>
                          <a
                            href={info.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              openInChromeCustomTabs(info.downloadUrl);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer no-underline"
                            title="ক্রোম বা ব্রাউজারে ওপেন করুন"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>ওপেন</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Direct Download in Browser / Custom Tabs */}
                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <a
                        href={info.downloadUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={info.fileName}
                        onClick={(e) => {
                          if (activeTab === 'apk') {
                            handleDownloadApkInCustomTab(e);
                          } else {
                            handleDownloadAabInCustomTab(e);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition cursor-pointer text-center no-underline"
                      >
                        <Download className="w-4 h-4" />
                        <span>Custom Tab দিয়ে ডাউনলোড</span>
                        <Globe className="w-3.5 h-3.5 text-emerald-200" />
                      </a>

                      <button
                        type="button"
                        onClick={handleDirectDownload}
                        disabled={downloading}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
                        title="সরাসরি ব্রাউজারে ডাউনলোড"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloading ? 'ডাউনলোড হচ্ছে...' : 'সরাসরি ডাউনলোড'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Both Packages Quick Access Summary */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div
                  onClick={() => setActiveTab('apk')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    activeTab === 'apk'
                      ? 'bg-emerald-950/50 border-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>APK প্যাকেজ</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {buildResult.apk.fileName}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('aab')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    activeTab === 'aab'
                      ? 'bg-purple-950/50 border-purple-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>AAB বান্ডেল</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {buildResult.aab?.fileName || `${config.appName.toLowerCase()}-release.aab`}
                  </div>
                </div>
              </div>

              {/* Instructions & Storage Location Box */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    ডাউনলোড হওয়ার পর ফাইলটি পাবেন:{' '}
                    <strong className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      Internal Storage &gt; Download
                    </strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong>WhatsApp</strong>-এ পাঠালে ফাইল ও ডাউনলোড লিংক সাথে সাথে সেভ হয়ে যাবে। আর <strong>পছন্দের ফোল্ডারে সেভ</strong> বাটনে ক্লিক করে ফোনের যেকোনো ফোল্ডার (বা মেমোরি কার্ড) বাছাই করে সেভ করতে পারবেন।
                </p>
              </div>

              {/* Release links */}
              {buildResult.releaseUrl && (
                <div className="flex items-center justify-end text-xs pt-0.5">
                  <a
                    href={buildResult.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline flex items-center gap-1 text-[11px]"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Release পেজ দেখুন ↗</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ================= STAGE 3: ERROR ================= */}
          {stage === 'error' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">বিল্ড সম্পন্ন করা যায়নি</h4>
                <p className="text-xs text-red-300 max-w-md mx-auto">{errorMessage}</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>পুনরায় চেষ্টা করুন</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
