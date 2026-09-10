export type AdNetwork = 'admob' | 'startio' | 'none';
export type CacheMode = 'no_cache' | 'default_cache' | 'highly_cached';
export type AppOrientation = 'auto_rotate' | 'portrait' | 'landscape';

export interface AppPermissions {
  internet: boolean;
  accessNetworkState: boolean;
  accessCoarseLocation: boolean;
  accessFineLocation: boolean;
  camera: boolean;
  readExternalStorage: boolean;
  writeExternalStorage: boolean;
  recordAudio: boolean;
  modifyAudioSettings: boolean;
  vibrate: boolean;
}

export interface AdMobConfig {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
}

export interface StartIoConfig {
  appId: string;
  showBanner: boolean;
  showInterstitial: boolean;
  showRewarded: boolean;
}

export interface KeystoreConfig {
  useCustomKeystore: boolean;
  keystoreFileName: string;
  keystoreBase64?: string; // Uploaded .jks or .keystore file in base64
  storePassword: string;
  keyAlias: string;
  keyPassword: string;
  validityYears: number; // Google Play requires at least 25 years
  certificateName: string; // e.g. "WebToApk Publisher"
  organization: string; // e.g. "App Studio"
}

export interface AppConfig {
  appName: string;
  packageName: string;
  websiteUrl: string;
  appLogoUrl: string;
  splashImageUrl: string;
  splashDuration: number; // in seconds
  splashBgColor: string;

  // App Versioning
  versionName: string;
  versionCode: number;

  // App Orientation
  orientation: AppOrientation;

  // Webview & App Feature Checkboxes (Tickmarks)
  textSelection: boolean;
  saveFormData: boolean;
  fullscreenMode: boolean; // edge-to-edge immersive, no top/bottom navigation
  confirmOnExit: boolean;
  enableGpsPrompt: boolean;
  pullToRefresh: boolean;
  deepLinking: boolean;
  showProgressWheel: boolean; // Circular spinner when page loads and hides on finish
  useCustomTabs: boolean; // Open external links in Chrome Custom Tabs
  enablePaymentRedirects: boolean; // Handle payment gateways, popups, and wallet app return redirects

  // Cache Mode
  cacheMode: CacheMode;
  cacheEnabled: boolean; // backward compatibility

  // Ads Configuration
  adNetwork: AdNetwork;
  interstitialIntervalMinutes: number; // Minutes interval between interstitial ads
  admob: AdMobConfig;
  startio: StartIoConfig;

  // Permissions (Tickmark options)
  permissions: AppPermissions;

  // Keystore & Display
  keystore: KeystoreConfig;
  allowZoom: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'Apk Creator 25',
  packageName: 'com.apkcreator25.app',
  websiteUrl: 'https://apkcreator25.blogspot.com',
  appLogoUrl:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
  splashImageUrl:
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
  splashDuration: 2.5,
  splashBgColor: '#0f172a',

  versionName: '1.0.0',
  versionCode: 1,

  orientation: 'portrait',

  textSelection: true,
  saveFormData: true,
  fullscreenMode: true,
  confirmOnExit: true,
  enableGpsPrompt: false,
  pullToRefresh: true,
  deepLinking: true,
  showProgressWheel: true,
  useCustomTabs: true,
  enablePaymentRedirects: true,

  cacheMode: 'default_cache',
  cacheEnabled: true,

  adNetwork: 'admob',
  interstitialIntervalMinutes: 3,
  admob: {
    appId: '', // Real Live AdMob App ID entered by user
    bannerId: '', // Real Live Banner ID
    interstitialId: '', // Real Live Interstitial ID
    rewardedId: '', // Real Live Rewarded ID
  },
  startio: {
    appId: '', // Real Live Start.io App ID entered by user
    showBanner: true,
    showInterstitial: true,
    showRewarded: true,
  },

  permissions: {
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
  },

  keystore: {
    useCustomKeystore: false,
    keystoreFileName: 'my-release-key.jks',
    keystoreBase64: '',
    storePassword: '',
    keyAlias: '',
    keyPassword: '',
    validityYears: 25,
    certificateName: 'Web To APK Release',
    organization: 'Android Mobile Apps',
  },
  allowZoom: false,
};

