import React, { useRef } from 'react';
import {
  Globe,
  Smartphone,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Clock,
  Palette,
  ExternalLink,
  Info,
  CheckSquare,
  Square,
  Sliders,
  Zap,
  Shield,
  ShieldCheck,
  RefreshCw,
  Compass,
  Link2,
  MousePointer,
  Database,
  Timer,
  RotateCw,
  Monitor,
  Camera,
  Bell,
  Volume2,
  FileText,
  Loader,
  Hash,
  Tag,
  CreditCard,
  Wallet,
} from 'lucide-react';
import {
  AppConfig,
  AdNetwork,
  CacheMode,
  AppOrientation,
  AppPermissions,
} from '../types';
import { KeystoreSection } from './KeystoreSection';

interface AppConfigFormProps {
  config: AppConfig;
  onChange: (updated: Partial<AppConfig>) => void;
  onAdMobChange: (updated: Partial<AppConfig['admob']>) => void;
  onStartIoChange: (updated: Partial<AppConfig['startio']>) => void;
  onKeystoreChange: (updated: Partial<AppConfig['keystore']>) => void;
  onOkAndSave?: () => void;
}

const PRESET_LOGOS = [
  { label: 'Gradient Sphere', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' },
  { label: 'Neon Cyber', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&auto=format&fit=crop&q=80' },
  { label: 'Minimal Geo', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80' },
  { label: 'Abstract Tech', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=300&auto=format&fit=crop&q=80' },
];

const PRESET_SPLASHES = [
  { label: 'Deep Blue Nebula', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80', color: '#0f172a' },
  { label: 'Dark Violet Glow', url: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?w=800&auto=format&fit=crop&q=80', color: '#1e1035' },
  { label: 'Emerald Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', color: '#064e3b' },
  { label: 'Minimal Charcoal', url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&auto=format&fit=crop&q=80', color: '#18181b' },
];

export const AppConfigForm: React.FC<AppConfigFormProps> = ({
  config,
  onChange,
  onAdMobChange,
  onStartIoChange,
  onKeystoreChange,
  onOkAndSave,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers (converts image to Data URL for instant preview & export)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          onChange({ appLogoUrl: uploadEvent.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSplashUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          onChange({ splashImageUrl: uploadEvent.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Derive package name automatically from app name
  const handleAutoDerivePackage = () => {
    const cleanName = config.appName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    onChange({ packageName: `com.company.${cleanName || 'app'}` });
  };

  // Permission toggle handler
  const handlePermissionToggle = (key: keyof AppPermissions) => {
    const current = config.permissions || {
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
    onChange({
      permissions: {
        ...current,
        [key]: !current[key],
      },
    });
  };

  const isValidUrl =
    config.websiteUrl.startsWith('http://') || config.websiteUrl.startsWith('https://');

  // Custom Feature tickmark options requested by user
  const featureCheckboxes = [
    {
      id: 'textSelection',
      title: 'Text Selection (টেক্সট সিলেকশন)',
      desc: 'Allow users to select, highlight, and copy text inside the webview',
      checked: !!config.textSelection,
      toggle: () => onChange({ textSelection: !config.textSelection }),
      icon: MousePointer,
    },
    {
      id: 'saveFormData',
      title: 'Save Form Data (ফর্ম ডাটা সেভ)',
      desc: 'Remember input field data, form submissions, and login cookies',
      checked: !!config.saveFormData,
      toggle: () => onChange({ saveFormData: !config.saveFormData }),
      icon: FileText,
    },
    {
      id: 'fullscreenMode',
      title: 'Full Screen (ফুলস্ক্রিন ইমার্সিভ)',
      desc: 'Pure fullscreen edge-to-edge mode hiding top status bar and bottom navigation',
      checked: !!config.fullscreenMode,
      toggle: () => onChange({ fullscreenMode: !config.fullscreenMode }),
      icon: Monitor,
    },
    {
      id: 'confirmOnExit',
      title: 'Confirm on Exit (ব্যাক প্রস্থান নিশ্চিতকরণ)',
      desc: 'Show a prompt dialog when user presses back button to prevent accidental exit',
      checked: !!config.confirmOnExit,
      toggle: () => onChange({ confirmOnExit: !config.confirmOnExit }),
      icon: AlertCircle,
    },
    {
      id: 'enableGpsPrompt',
      title: 'Enable GPS Prompt (জিপিএস প্রম্পট)',
      desc: 'Prompts users for location permission whenever website requests geolocation',
      checked: !!config.enableGpsPrompt,
      toggle: () => onChange({ enableGpsPrompt: !config.enableGpsPrompt }),
      icon: Compass,
    },
    {
      id: 'pullToRefresh',
      title: 'Pull to Refresh (সোয়াইপ রিফ্রেশ)',
      desc: 'Swipe down from the top of the screen to quickly reload the webpage',
      checked: !!config.pullToRefresh,
      toggle: () => onChange({ pullToRefresh: !config.pullToRefresh }),
      icon: RefreshCw,
    },
    {
      id: 'deepLinking',
      title: 'Deep Linking (ডিপ লিঙ্কিং)',
      desc: 'Open web links directly in the application with Android intent filters',
      checked: !!config.deepLinking,
      toggle: () => onChange({ deepLinking: !config.deepLinking }),
      icon: Link2,
    },
    {
      id: 'showProgressWheel',
      title: 'Progress Wheel on Loading (লোডিং প্রগ্রেস হুইল)',
      desc: 'Shows a circular loading spinner while webpage is loading and hides when ready',
      checked: config.showProgressWheel !== false,
      toggle: () => onChange({ showProgressWheel: !config.showProgressWheel }),
      icon: Loader,
    },
    {
      id: 'useCustomTabs',
      title: 'Chrome Custom Tabs (ইন-অ্যাপ ক্রোম কাস্টম ট্যাব)',
      desc: 'Opens external links smoothly inside Chrome Custom Tabs without breaking webview navigation',
      checked: config.useCustomTabs !== false,
      toggle: () => onChange({ useCustomTabs: !config.useCustomTabs }),
      icon: ExternalLink,
    },
    {
      id: 'enablePaymentRedirects',
      title: 'Popup & Wallet Payment Support (পপআপ ও ওয়ালেট পেমেন্ট)',
      desc: 'Enables popups, payment gateways, subscriptions, and wallet apps (bKash, Nagad, UPI, Paytm, GPay) with auto-return to app upon success',
      checked: config.enablePaymentRedirects !== false,
      toggle: () => onChange({ enablePaymentRedirects: !config.enablePaymentRedirects }),
      icon: CreditCard,
    },
  ];

  // Permissions list requested by user
  const permissionsList: {
    key: keyof AppPermissions;
    name: string;
    bengali: string;
    manifestTag: string;
    desc: string;
  }[] = [
    {
      key: 'internet',
      name: 'Internet',
      bengali: 'ইন্টারনেট এক্সেস',
      manifestTag: 'android.permission.INTERNET',
      desc: 'Required to load web content and online assets',
    },
    {
      key: 'accessNetworkState',
      name: 'Access Network State',
      bengali: 'নেটওয়ার্ক স্টেট পর্যবেক্ষণ',
      manifestTag: 'android.permission.ACCESS_NETWORK_STATE',
      desc: 'Detect Wi-Fi, cellular connectivity, and offline state',
    },
    {
      key: 'accessCoarseLocation',
      name: 'Access Coarse Location',
      bengali: 'কোর্স লোকেশন (সেল/ওয়াইফাই)',
      manifestTag: 'android.permission.ACCESS_COARSE_LOCATION',
      desc: 'Approximate city-level location',
    },
    {
      key: 'accessFineLocation',
      name: 'Access Fine Location',
      bengali: 'ফাইন জিপিএস লোকেশন',
      manifestTag: 'android.permission.ACCESS_FINE_LOCATION',
      desc: 'Precise satellite GPS coordinates for maps and navigation',
    },
    {
      key: 'camera',
      name: 'Camera',
      bengali: 'ক্যামেরা এক্সেস',
      manifestTag: 'android.permission.CAMERA',
      desc: 'QR scanner, photo capture, and live camera feed for forms',
    },
    {
      key: 'readExternalStorage',
      name: 'Read External Storage',
      bengali: 'স্টোরেজ থেকে ফাইল রিড',
      manifestTag: 'android.permission.READ_EXTERNAL_STORAGE',
      desc: 'Select and upload documents, photos, or audio',
    },
    {
      key: 'writeExternalStorage',
      name: 'Write External Storage',
      bengali: 'স্টোরেজে ফাইল সেভ',
      manifestTag: 'android.permission.WRITE_EXTERNAL_STORAGE',
      desc: 'Save downloaded files and receipts to phone memory',
    },
    {
      key: 'recordAudio',
      name: 'Record Audio & Modify Audio',
      bengali: 'অডিও রেকর্ড ও সাউন্ড পরিবর্তন',
      manifestTag: 'android.permission.RECORD_AUDIO & MODIFY_AUDIO_SETTINGS',
      desc: 'Voice search, microphone access, and audio volume control',
    },
    {
      key: 'vibrate',
      name: 'Vibrate',
      bengali: 'ভাইব্রেশন ও হ্যাপটিক',
      manifestTag: 'android.permission.VIBRATE',
      desc: 'Haptic feedback on clicks, alerts, and notifications',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Basic Web App Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Website & App Details</h2>
            <p className="text-xs text-slate-400">
              ওয়েবসাইটের URL, অ্যাপের নাম এবং প্যাকেজ নেম
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Website URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Website URL (ওয়েবসাইটের লিঙ্ক)
              </span>
              {isValidUrl ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid URL
                </span>
              ) : (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Include https://
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="url"
                value={config.websiteUrl}
                onChange={(e) => onChange({ websiteUrl: e.target.value })}
                placeholder="https://yourwebsite.com"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              The APK will load this website inside an edge-to-edge fullscreen WebView.
            </p>
          </div>

          {/* App Name & Package Name grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                App Name (অ্যাপের নাম)
              </label>
              <input
                type="text"
                value={config.appName}
                onChange={(e) => onChange({ appName: e.target.value })}
                placeholder="e.g. Apk Creator 25"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Package Name (প্যাকেজ নেম)</span>
                <button
                  type="button"
                  onClick={handleAutoDerivePackage}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Auto-generate
                </button>
              </label>
              <input
                type="text"
                value={config.packageName}
                onChange={(e) => onChange({ packageName: e.target.value })}
                placeholder="com.company.appname"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono transition outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Versioning & Screen Orientation */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">App Version & Orientation</h2>
            <p className="text-xs text-slate-400">
              অ্যাপের ভার্সন এবং স্ক্রিন ওরিয়েন্টেশন নির্ধারণ করুন
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Version Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                Version Name (ভার্সন নেম)
              </label>
              <input
                type="text"
                value={config.versionName || '1.0.0'}
                onChange={(e) => onChange({ versionName: e.target.value })}
                placeholder="1.0.0"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 transition outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Visible to users in Google Play or Settings (e.g. 1.0.0, 2.1.4)
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                Version Code (ভার্সন কোড)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={config.versionCode || 1}
                onChange={(e) => onChange({ versionCode: parseInt(e.target.value, 10) || 1 })}
                placeholder="1"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 transition outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Internal integer code (increment by 1 for each Play Store update)
              </p>
            </div>
          </div>

          {/* Android Target SDK & Signature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Minimum SDK</span>
                <span className="text-xs font-bold text-white font-mono">SDK 23 (Android 6.0)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Target & Compile SDK</span>
                <span className="text-xs font-bold text-white font-mono">SDK 36 (Android 16 Baklava)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Signature Schemes</span>
                <span className="text-xs font-bold text-white font-mono">v1 + v2 + v3 + v4</span>
              </div>
            </div>
          </div>

          {/* Screen Orientation Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Screen Orientation (অ্যাপ ওরিয়েন্টেশন)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'auto_rotate' as AppOrientation,
                  label: 'Auto Rotate (অটো রোটেট)',
                  desc: 'Rotates with device sensor dynamically',
                  icon: RotateCw,
                },
                {
                  id: 'portrait' as AppOrientation,
                  label: 'Portrait (পোর্ট্রেট)',
                  desc: 'Fixed vertical orientation for phones',
                  icon: Smartphone,
                },
                {
                  id: 'landscape' as AppOrientation,
                  label: 'Landscape (ল্যান্ডস্কেপ)',
                  desc: 'Fixed horizontal orientation for media',
                  icon: Monitor,
                },
              ].map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = (config.orientation || 'auto_rotate') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ orientation: opt.id })}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 ring-1 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-semibold block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. App Logo & Splash Screen */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            3
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">App Logo & Splash Screen</h2>
            <p className="text-xs text-slate-400">
              অ্যাপের আইকন ও স্প্ল্যাশ ইমেজ আপলোড করুন বা সিলেক্ট করুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* App Logo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                App Launcher Icon (অ্যাপ আইকন)
              </label>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Upload Custom Logo
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow-md">
                <img
                  src={config.appLogoUrl}
                  alt="App Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={config.appLogoUrl}
                  onChange={(e) => onChange({ appLogoUrl: e.target.value })}
                  placeholder="https://... image URL"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Square 512x512 PNG recommended for clean app launcher display.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Or choose a preset:</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_LOGOS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onChange({ appLogoUrl: item.url })}
                    className={`h-12 rounded-xl overflow-hidden border-2 transition ${
                      config.appLogoUrl === item.url
                        ? 'border-teal-500 ring-2 ring-teal-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Splash Screen */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Splash Screen Image (স্প্ল্যাশ স্ক্রিন)
              </label>
              <button
                type="button"
                onClick={() => splashInputRef.current?.click()}
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Upload Splash
              </button>
              <input
                type="file"
                ref={splashInputRef}
                onChange={handleSplashUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-4 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div
                className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-700 shadow-md relative"
                style={{ backgroundColor: config.splashBgColor }}
              >
                <img
                  src={config.splashImageUrl}
                  alt="Splash Preview"
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={config.splashImageUrl}
                  onChange={(e) => onChange({ splashImageUrl: e.target.value })}
                  placeholder="https://... splash URL"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Duration:</span>
                  <select
                    value={config.splashDuration}
                    onChange={(e) => onChange({ splashDuration: Number(e.target.value) })}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                  >
                    <option value={1000}>1.0s (Fast)</option>
                    <option value={2000}>2.0s (Normal)</option>
                    <option value={3000}>3.0s (Relaxed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Or choose a backdrop:</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_SPLASHES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() =>
                      onChange({ splashImageUrl: item.url, splashBgColor: item.color })
                    }
                    className={`h-9 rounded-lg overflow-hidden border-2 transition ${
                      config.splashImageUrl === item.url
                        ? 'border-teal-500 ring-2 ring-teal-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Feature Tickmark Options (ইউজার নিজের অ্যাপে যা যা চাই টিকমার্ক দিয়ে বেছে নিতে পারবে) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            4
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              App Features Selection (টিকমার্ক অপশনস)
            </h2>
            <p className="text-xs text-slate-400">
              অ্যাপের প্রয়োজনীয় সুবিধাসমূহ টিকমার্ক দিয়ে অন বা অফ রাখুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {featureCheckboxes.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                onClick={item.toggle}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 border transition ${
                    item.checked
                      ? 'bg-emerald-500 border-emerald-400 text-black font-bold'
                      : 'border-slate-700 bg-slate-800/80 text-transparent'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <IconComponent
                      className={`w-3.5 h-3.5 ${item.checked ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span
                      className={`text-xs font-semibold ${item.checked ? 'text-white' : 'text-slate-300'}`}
                    >
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Cache Mode Options (ক্যাশ মোড অপশন) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            5
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Cache Mode Options (ক্যাশ মোড)</h2>
            <p className="text-xs text-slate-400">
              অ্যাপের ব্রাউজিং স্পিড ও ডেটা সেভিং মোড সিলেক্ট করুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'no_cache' as CacheMode,
              title: 'No Cache (নো ক্যাশ)',
              desc: 'LOAD_NO_CACHE: Always fetches live online data directly. Never uses cache.',
              badge: 'Live Data',
            },
            {
              id: 'default_cache' as CacheMode,
              title: 'Default Cache (ডিফল্ট ক্যাশ)',
              desc: 'LOAD_DEFAULT: Standard browser caching with normal asset revalidation.',
              badge: 'Recommended',
            },
            {
              id: 'highly_cached' as CacheMode,
              title: 'Highly Cached (হাইলি ক্যাশড)',
              desc: 'LOAD_CACHE_ELSE_NETWORK: Fast offline loading, uses cache if available.',
              badge: 'Fast & Offline',
            },
          ].map((mode) => {
            const isSelected = (config.cacheMode || 'default_cache') === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => onChange({ cacheMode: mode.id })}
                className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-xs font-semibold ${isSelected ? 'text-purple-300 font-bold' : 'text-slate-300'}`}
                    >
                      {mode.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isSelected
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {mode.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{mode.desc}</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-700'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={isSelected ? 'text-purple-300 font-medium' : 'text-slate-500'}>
                    {isSelected ? 'Active Mode' : 'Select Mode'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Ads Section (AdMob vs Start.io) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              6
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Ads Monetization & Interstitial Frequency
              </h2>
              <p className="text-xs text-slate-400">
                গুগল অ্যাডমব বা স্টার্ট.আইও অ্যাডস এবং ইন্টারস্টিশিয়াল অ্যাড ইন্টারভ্যাল
              </p>
            </div>
          </div>
        </div>

        {/* Network Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => onChange({ adNetwork: 'admob' })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition ${
              config.adNetwork === 'admob'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Google AdMob</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ adNetwork: 'startio' })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition ${
              config.adNetwork === 'startio'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Start.io</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ adNetwork: 'none' })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition ${
              config.adNetwork === 'none'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>No Ads (Clean)</span>
          </button>
        </div>

        {/* Interstitial Interval Frequency - Requested explicitly by user: "interstitial ta koto minute por por shhow hobe" */}
        {config.adNetwork !== 'none' && (
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Interstitial Ad Interval (ইন্টারস্টিশিয়াল অ্যাড কতো মিনিট পর পর শো হবে):
              </label>
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                Every {config.interstitialIntervalMinutes || 3} Minutes
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={config.interstitialIntervalMinutes || 3}
                onChange={(e) =>
                  onChange({ interstitialIntervalMinutes: parseInt(e.target.value, 10) || 3 })
                }
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1 min</span>
                <span>5 min</span>
                <span>10 min</span>
                <span>15 min</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              The app automatically loads and displays the interstitial ad every {config.interstitialIntervalMinutes || 3} minute(s) in the background without interrupting navigation.
            </p>
          </div>
        )}

        {/* Case A: Google AdMob Selected */}
        {config.adNetwork === 'admob' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-300">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-emerald-200 text-sm">
                    100% Real Live Ads Mode (কোনো ডেমো বিজ্ঞাপন নয়)
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-emerald-500/40">
                    GMA Next-Gen SDK
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-blue-500/40">
                    Target SDK 36
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  লেটেস্ট Google Mobile Ads (GMA) Next-Gen SDK যুক্ত করা হয়েছে। টেস্ট বা ডেমো মোড সম্পূর্ণ নিষ্ক্রিয় — আপনার অফিসিয়াল AdMob App ID ও Unit ID গুলো নিচে দিন। বিজ্ঞাপন তাৎক্ষণিকভাবে লাইভ শো হবে।
                </p>
              </div>
            </div>

            {/* 1. App ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                1. AdMob App ID (অ্যাপ আইডি)
              </label>
              <input
                type="text"
                value={config.admob.appId}
                onChange={(e) => onAdMobChange({ appId: e.target.value })}
                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-600 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Required in AndroidManifest.xml: `com.google.android.gms.ads.APPLICATION_ID`
              </p>
            </div>

            {/* 2. Banner Ad ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                2. Banner Ad ID (ব্যানার অ্যাড আইডি)
              </label>
              <input
                type="text"
                value={config.admob.bannerId}
                onChange={(e) => onAdMobChange({ bannerId: e.target.value })}
                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-600 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Displayed as a 320x50 smart banner at the bottom of the fullscreen app.
              </p>
            </div>

            {/* 3. Interstitial Ad ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                3. Interstitial Ad ID (ইন্টারস্টিশিয়াল অ্যাড আইডি)
              </label>
              <input
                type="text"
                value={config.admob.interstitialId}
                onChange={(e) => onAdMobChange({ interstitialId: e.target.value })}
                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/wwwwwwwwww"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-600 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Full-screen interstitial ad loaded according to the timer interval above.
              </p>
            </div>

            {/* 4. Rewarded Ad ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                4. Rewarded Ad ID (রিওয়ার্ড অ্যাড আইডি)
              </label>
              <input
                type="text"
                value={config.admob.rewardedId}
                onChange={(e) => onAdMobChange({ rewardedId: e.target.value })}
                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/vvvvvvvvvv"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-600 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                High-CPM rewarded video ad shown when user requests bonus/unlock features.
              </p>
            </div>
          </div>
        )}

        {/* Case B: Start.io Selected */}
        {config.adNetwork === 'startio' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-xs text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-cyan-200 text-sm">
                    100% Real Live Ads Mode (Start.io রিয়েল অ্যাডস চালু)
                  </span>
                  <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-cyan-500/40">
                    SDK 5.1.0
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-blue-500/40">
                    Android 6.0 – 16
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300/80 leading-relaxed">
                  স্টার্ট.আইও ইন-অ্যাপ SDK 5.1.0 (<code className="font-mono text-cyan-200">com.startapp:inapp-sdk:5.1.0</code>) কনফিগার করা রয়েছে। টেস্ট মোড বন্ধ — আপনার অফিসিয়াল Start.io App ID দিন এবং নিচের ৩টি ফরম্যাট থেকে বেছে নিন।
                </p>
              </div>
            </div>

            {/* Start.io App ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Start.io App ID (স্টার্ট.আইও অ্যাডস আইডি)
              </label>
              <input
                type="text"
                value={config.startio.appId}
                onChange={(e) => onStartIoChange({ appId: e.target.value })}
                placeholder="e.g. 208765432"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-600 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                StartAppSDK.init(this, "{config.startio.appId || 'APP_ID'}", false)
              </p>
            </div>

            {/* 3 Tick Marks for Start.io Ad Formats */}
            <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Select Active Ads (টিক মার্ক দিন যা যা শো হবে):
              </label>

              {/* Tick 1: Banner */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      onStartIoChange({ showBanner: !config.startio.showBanner });
                    }}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                      config.startio.showBanner
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {config.startio.showBanner && <CheckSquare className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white block">
                      1. Banner Ad (ব্যানার অ্যাড)
                    </span>
                    <span className="text-xs text-slate-400">
                      Shows bottom sticky banner advertisement
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    config.startio.showBanner
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {config.startio.showBanner ? 'Active' : 'Off'}
                </span>
              </label>

              {/* Tick 2: Interstitial */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      onStartIoChange({ showInterstitial: !config.startio.showInterstitial });
                    }}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                      config.startio.showInterstitial
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {config.startio.showInterstitial && <CheckSquare className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white block">
                      2. Interstitial Ad (ইন্টারস্টিশিয়াল অ্যাড)
                    </span>
                    <span className="text-xs text-slate-400">
                      Shows full-screen automatic interstitial
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    config.startio.showInterstitial
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {config.startio.showInterstitial ? 'Active' : 'Off'}
                </span>
              </label>

              {/* Tick 3: Rewarded */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      onStartIoChange({ showRewarded: !config.startio.showRewarded });
                    }}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                      config.startio.showRewarded
                        ? 'bg-cyan-600 border-cyan-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {config.startio.showRewarded && <CheckSquare className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white block">
                      3. Rewarded Ad (রিওয়ার্ড অ্যাড)
                    </span>
                    <span className="text-xs text-slate-400">
                      Shows rewarded video ad with user bonus callback
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    config.startio.showRewarded
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {config.startio.showRewarded ? 'Active' : 'Off'}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Case C: No Ads Selected */}
        {config.adNetwork === 'none' && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-slate-400 text-xs">
            No advertisements configured. The resulting APK will be 100% ad-free and distraction-free.
          </div>
        )}
      </div>

      {/* 7. Customizable Android Permissions (কাস্টমাইজ পারমিশনস - টিকমার্ক অপশনস) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              7
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Customize Permissions (কাস্টমাইজ পারমিশনস)
              </h2>
              <p className="text-xs text-slate-400">
                অ্যাপের প্রয়োজনীয় অ্যান্ড্রয়েড পারমিশন সিলেক্ট করুন
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            AndroidManifest.xml
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {permissionsList.map((perm) => {
            const isChecked = !!config.permissions?.[perm.key];
            return (
              <div
                key={perm.key}
                onClick={() => handlePermissionToggle(perm.key)}
                className={`p-3.5 rounded-xl border cursor-pointer select-none transition flex items-start gap-3 ${
                  isChecked
                    ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 border transition ${
                    isChecked
                      ? 'bg-rose-500 border-rose-400 text-white font-bold'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold ${isChecked ? 'text-white' : 'text-slate-300'}`}
                    >
                      {perm.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        isChecked ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isChecked ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-300/80 block mt-0.5">{perm.bengali}</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">{perm.desc}</p>
                  <code className="text-[9px] text-slate-500 block mt-1.5 font-mono truncate">
                    {perm.manifestTag}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Custom Keystore & Signing Section */}
      <KeystoreSection
        keystore={config.keystore}
        appName={config.appName}
        onChange={onKeystoreChange}
      />
    </div>
  );
};
