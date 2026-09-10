import React, { useState } from 'react';
import { AppConfig, DEFAULT_APP_CONFIG } from './types';
import { Navbar } from './components/Navbar';
import { AppConfigForm } from './components/AppConfigForm';
import { MobileDevicePreview } from './components/MobileDevicePreview';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { BuildGuideModal } from './components/BuildGuideModal';
import { DownloadApkModal } from './components/DownloadApkModal';
import { GitHubBuildModal } from './components/GitHubBuildModal';
import { OkSaveModal } from './components/OkSaveModal';
import { exportAndroidProjectZip } from './utils/zipExporter';
import { downloadBlobOrFile, openInChromeCustomTabs } from './utils/fileDownloader';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Eye,
  Sliders,
  Code2,
  Layers,
  FileArchive,
  Github,
  Globe,
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showApkModal, setShowApkModal] = useState(false);
  const [showOkSaveModal, setShowOkSaveModal] = useState(false);
  const [apkModalFormat, setApkModalFormat] = useState<'apk' | 'aab'>('apk');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenApkModal = (format: 'apk' | 'aab' = 'apk') => {
    setApkModalFormat(format);
    setShowApkModal(true);
  };

  const handleConfigChange = (updated: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleAdMobChange = (updated: Partial<AppConfig['admob']>) => {
    setConfig((prev) => ({
      ...prev,
      admob: { ...prev.admob, ...updated },
    }));
  };

  const handleStartIoChange = (updated: Partial<AppConfig['startio']>) => {
    setConfig((prev) => ({
      ...prev,
      startio: { ...prev.startio, ...updated },
    }));
  };

  const handleKeystoreChange = (updated: Partial<AppConfig['keystore']>) => {
    setConfig((prev) => ({
      ...prev,
      keystore: { ...prev.keystore, ...updated },
    }));
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const blob = await exportAndroidProjectZip(config);
      const safeName = config.appName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'android_app';
      const fileName = `${safeName}_fullscreen_apk_project.zip`;
      await downloadBlobOrFile(blob, fileName, 'application/zip');
      showToast('APK Project ZIP downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to create ZIP package. Please check inputs.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLoadPreset = (presetName: string) => {
    if (presetName === 'store') {
      setConfig({
        ...DEFAULT_APP_CONFIG,
        appName: 'TrendStore App',
        packageName: 'com.trendstore.shop',
        websiteUrl: 'https://fakestoreapi.com',
        appLogoUrl:
          'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&auto=format&fit=crop&q=80',
        splashImageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
        splashBgColor: '#0f172a',
        adNetwork: 'admob',
        admob: {
          appId: '',
          bannerId: '',
          interstitialId: '',
          rewardedId: '',
        },
      });
      showToast('Loaded E-Commerce Store template (Ready for your AdMob IDs)');
    } else if (presetName === 'news') {
      setConfig({
        ...DEFAULT_APP_CONFIG,
        appName: 'Daily News 24',
        packageName: 'com.dailynews.portal',
        websiteUrl: 'https://en.wikipedia.org/wiki/Portal:Current_events',
        appLogoUrl:
          'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80',
        splashImageUrl:
          'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
        splashBgColor: '#18181b',
        adNetwork: 'admob',
        admob: {
          appId: '',
          bannerId: '',
          interstitialId: '',
          rewardedId: '',
        },
      });
      showToast('Loaded News Portal template (Ready for your AdMob IDs)');
    } else if (presetName === 'game') {
      setConfig({
        ...DEFAULT_APP_CONFIG,
        appName: 'Cyber Retro Game',
        packageName: 'com.cybergame.arcade',
        websiteUrl: 'https://play2048.co',
        appLogoUrl:
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
        splashImageUrl:
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
        splashBgColor: '#0b0f19',
        adNetwork: 'startio',
        startio: {
          appId: '',
          showBanner: true,
          showInterstitial: true,
          showRewarded: true,
        },
      });
      showToast('Loaded Web Game template with Start.io (Ready for your App ID)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black overflow-x-hidden w-full max-w-full">
      {/* Top Navbar */}
      <Navbar
        config={config}
        onOpenApkModal={handleOpenApkModal}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
        onOpenCodeModal={() => setShowCodeModal(true)}
        onOpenGuideModal={() => setShowGuideModal(true)}
        onOpenGitHubModal={() => setShowGitHubModal(true)}
        onLoadPreset={handleLoadPreset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-10 lg:pb-8 overflow-hidden">
        {/* Mobile View Switcher (for small screens) */}
        <div className="lg:hidden flex items-center justify-center p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setMobileTab('config')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'config'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'preview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Preview</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Main Column: Settings Form */}
          <div
            className={`lg:col-span-7 xl:col-span-7 space-y-6 ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            <AppConfigForm
              config={config}
              onChange={handleConfigChange}
              onAdMobChange={handleAdMobChange}
              onStartIoChange={handleStartIoChange}
              onKeystoreChange={handleKeystoreChange}
            />

            {/* ONLY ONE BUTTON: OK & Save */}
            <div className="pt-4 pb-2">
              <button
                type="button"
                onClick={() => setShowOkSaveModal(true)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 font-extrabold text-lg sm:text-xl text-slate-950 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition flex items-center justify-center cursor-pointer border border-emerald-400/40"
              >
                OK &amp; Save
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Phone Simulator */}
          <div
            className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 flex flex-col items-center ${
              mobileTab === 'config' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="w-full flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                Live Mobile Simulator
              </span>
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% Immersive
              </span>
            </div>

            <MobileDevicePreview config={config} />
          </div>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-3 sm:right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in slide-in-from-bottom-5 duration-200 max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ⭐ OK & Save Flow Modal (Loading Spring & Direct Download APK / AAB Hub) ⭐ */}
      <OkSaveModal
        isOpen={showOkSaveModal}
        onClose={() => setShowOkSaveModal(false)}
        config={config}
        onToast={showToast}
      />

      {/* Direct APK & AAB Download Modal */}
      <DownloadApkModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
        config={config}
        initialFormat={apkModalFormat}
        onToast={showToast}
        onOpenGitHubModal={() => {
          setShowApkModal(false);
          setShowGitHubModal(true);
        }}
        onDownloadZip={handleDownloadZip}
      />

      {/* Code Inspector Modal */}
      <CodeInspectorModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        config={config}
      />

      {/* Build Guide Modal */}
      <BuildGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* GitHub Actions & Mobile Install Modal */}
      <GitHubBuildModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onToast={showToast}
      />
    </div>
  );
}
