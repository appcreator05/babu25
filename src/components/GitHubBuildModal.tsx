import React, { useState } from 'react';
import {
  X,
  Github,
  Smartphone,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface GitHubBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const GitHubBuildModal: React.FC<GitHubBuildModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'pwa' | 'local'>('workflow');
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const WORKFLOW_YAML = `name: Build APK Creator Android App

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-android-apk:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Dependencies
        run: npm install

      - name: Build Web Application
        run: npm run build

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.5'

      - name: Sync Web Assets to Android App
        run: |
          mkdir -p android/app/src/main/assets/web
          cp -r dist/* android/app/src/main/assets/web/

      - name: Build Android APK
        run: |
          cd android
          gradle assembleDebug --no-daemon --stacktrace
          gradle assembleRelease --no-daemon --stacktrace || true

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: apk-creator-android-app
          path: |
            android/app/build/outputs/apk/debug/*.apk
            android/app/build/outputs/apk/release/*.apk
          retention-days: 30`;

  const GIT_COMMANDS = `# 1. Initialize git & commit all files
git init
git add .
git commit -m "Initial commit: APK Creator with GitHub Actions Android Build"

# 2. Add your GitHub repository URL
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apk-creator.git

# 3. Push to GitHub (Actions will automatically start building the APK!)
git push -u origin main`;

  const handleCopyWorkflow = () => {
    navigator.clipboard.writeText(WORKFLOW_YAML);
    setCopiedWorkflow(true);
    onToast('GitHub Actions workflow copied to clipboard!');
    setTimeout(() => setCopiedWorkflow(false), 3000);
  };

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(GIT_COMMANDS);
    setCopiedCommands(true);
    onToast('Git commands copied to clipboard!');
    setTimeout(() => setCopiedCommands(false), 3000);
  };

  const handleInstallPWA = async () => {
    const success = await install();
    if (success) {
      onToast('APK Creator installed on your device!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Build APK Creator via GitHub</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  GitHub Actions
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                গিটহাবের মাধ্যমে এই পুরো অ্যাপটির একটি ইন্সটলেবল APK তৈরি করুন এবং যেকোনো ফোনে চালান
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'workflow'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>1. GitHub Actions Build (Recommended)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'pwa'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>2. Instant Mobile Install (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'local'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>3. Android Studio / CLI</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* TAB 1: GitHub Actions */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 rounded-xl p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-purple-200 text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>গিটহাবে পুশ করলেই স্বয়ংক্রিয়ভাবে APK তৈরি হবে!</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  এই রিপোজিটরির ভেতরে ইতিমধ্যে <code className="text-purple-300 bg-purple-950/70 px-1 py-0.5 rounded font-mono">.github/workflows/build-apk.yml</code> এবং সম্পূর্ণ <code className="text-purple-300 bg-purple-950/70 px-1 py-0.5 rounded font-mono">android/</code> প্রজেক্ট যুক্ত করে দেওয়া হয়েছে।
                </p>
              </div>

              {/* Step by Step instructions */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  সহজ ৩টি ধাপে APK পাওয়ার নিয়ম:
                </h3>

                <div className="space-y-2.5 text-xs">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">কোডটি GitHub-এ পুশ করুন</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        প্রজেক্টের Settings থেকে <strong>Export to GitHub</strong> চাপুন অথবা আপনার টার্মিনাল থেকে গিটহাবে পুশ করুন।
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">GitHub Actions স্বয়ংক্রিয়ভাবে APK বিল্ড করবে</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        আপনার GitHub রিপোজিটরির <strong>Actions</strong> ট্যাবে গিয়ে দেখুন <code className="text-purple-300 font-mono">Build APK Creator Android App</code> স্বয়ংক্রিয়ভাবে রান হচ্ছে।
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-white">APK ফাইল ডাউনলোড করার ২টি সহজ জায়গা:</h4>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        বিল্ড সফল হলে আপনি ২টি জায়গা থেকে সরাসরি APK ডাউনলোড করতে পারবেন:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                          <strong className="block text-emerald-300 font-semibold mb-1">
                            পদ্ধতি ১: Releases থেকে (সরাসরি APK)
                          </strong>
                          <span>
                            আপনার রিপোজিটরির মূল পেজের ডানপাশে <strong>Releases</strong> সেকশনে যান। সেখানে থাকা <code className="bg-emerald-950 px-1 py-0.5 rounded font-mono text-emerald-300">apk-creator-app.apk</code> ফাইলে ক্লিক করলেই সরাসরি ডাউনলোড হবে!
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-purple-200">
                          <strong className="block text-purple-300 font-semibold mb-1">
                            পদ্ধতি ২: Actions Summary থেকে
                          </strong>
                          <span>
                            টার্মিনাল লগস পেজের বাম পাশে থাকা <strong>"Summary"</strong> বাটনে ক্লিক করুন। পেজের একদম নিচে স্ক্রল করলে <strong>Artifacts</strong> এর নিচে <span className="underline font-semibold">apk-creator-app</span> পেয়ে যাবেন।
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Git Terminal Commands snippet */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    Git Push Commands:
                  </span>
                  <button
                    onClick={handleCopyCommands}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {copiedCommands ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCommands ? 'Copied!' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {GIT_COMMANDS}
                </pre>
              </div>

              {/* Workflow Code Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-slate-400" />
                    .github/workflows/build-apk.yml (Included in project)
                  </span>
                  <button
                    onClick={handleCopyWorkflow}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {copiedWorkflow ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedWorkflow ? 'Copied!' : 'Copy YAML'}</span>
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10.5px] font-mono text-slate-400">
                  <pre>{WORKFLOW_YAML}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Instant Mobile Install (PWA) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-emerald-300 text-sm mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>কোনো বিল্ড ছাড়াও সরাসরি ফোনে ইনস্টল করা সম্ভব!</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  এই অ্যাপটিতে <strong>Progressive Web App (PWA)</strong> ইন্টিগ্রেট করা রয়েছে। যেকোনো অ্যান্ড্রয়েড মোবাইল থেকে এই লিংকটি ওপেন করলে এটি সরাসরি একটি আসল অ্যান্ড্রয়েড অ্যাপ্লিকেশনের মতো হোমস্ক্রিনে ইনস্টল হয়ে যায়।
                </p>
              </div>

              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block text-sm">App Already Installed!</span>
                    <span className="text-xs text-emerald-300/80">
                      এই ডিভাইসটিতে ইতিমধ্যে APK Creator অ্যাপ ইনস্টল অবস্থায় রান করছে।
                    </span>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-white text-sm">
                    ১-ট্যাপে সরাসরি এই ডিভাইসে ইনস্টল করুন
                  </h4>
                  <p className="text-slate-400 text-xs">
                    নিচের বাটনে চাপ দিলে আপনার মোবাইলের হোমস্ক্রিনে <strong className="text-white">APK Creator</strong> অ্যাপের আইকন যুক্ত হবে এবং ফুলস্ক্রিনে অ্যাপের মতো চলবে।
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallPWA}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install APK Creator on this Phone</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <h4 className="font-semibold text-white text-sm">
                    মোবাইল ব্রাউজার থেকে ইনস্টল করার নিয়ম:
                  </h4>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                      <span>মোবাইল ফোনে <strong>Google Chrome</strong> দিয়ে এই অ্যাপের লিংক ওপেন করুন।</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                      <span>ক্রোমের উপরের ডানদিকের <strong>3-Dots (⋮)</strong> মেনু চাপুন।</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                      <span><strong>"Install app"</strong> বা <strong>"Add to Home screen"</strong> চাপুন। ব্যাস, অ্যাপটি ইনস্টল হয়ে যাবে!</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Share link box */}
              <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Live App URL for Mobile:</span>
                  <span className="text-xs text-slate-300 font-mono truncate block">
                    {window.location.href}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    onToast('App link copied! Open on your mobile phone.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 shrink-0 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Local Android Studio / CLI */}
          {activeTab === 'local' && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>নিজের কম্পিউটারে Android Studio বা Gradle দিয়ে বিল্ড:</span>
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  এই রিপোজিটরির ভেতরে <code className="text-cyan-300 font-mono">android/</code> ফোল্ডারটি একটি সম্পূর্ণ অ্যান্ড্রয়েড স্টুডিও প্রজেক্ট।
                </p>

                <div className="pt-2 space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500 block"># 1. ওয়েব প্রজেক্ট বিল্ড করুন:</span>
                    npm install && npm run build
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500 block"># 2. ওয়েব ফাইল অ্যান্ড্রয়েড এসেটসে কপি করুন:</span>
                    mkdir -p android/app/src/main/assets/web<br />
                    cp -r dist/* android/app/src/main/assets/web/
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500 block"># 3. সরাসরি APK কম্পাইল করুন:</span>
                    cd android<br />
                    ./gradlew assembleDebug
                  </div>
                </div>

                <p className="text-[11px] text-emerald-400 pt-1">
                  ✓ কম্পাইল সম্পন্ন হলে <code className="font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code> ফাইলটি তৈরি হবে।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>GitHub Actions &amp; PWA Ready</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
