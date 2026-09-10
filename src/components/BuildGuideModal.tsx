import React from 'react';
import { X, Smartphone, CheckCircle, Terminal, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface BuildGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuildGuideModal: React.FC<BuildGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              How to Build & Export Your APK File
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* Direct APK Download Guide */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              সরাসরি .APK / .AAB ডাউনলোড (Direct One-Click Download)
            </h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              আপনি যদি কোনো ZIP ফাইল বা অ্যান্ড্রয়েড স্টুডিও ছাড়া সরাসরি মোবাইলে ইনস্টল করতে চান, তবে মূল পেইজের{' '}
              <strong className="text-white font-mono">"Download Direct APK (.apk)"</strong> বাটনে ক্লিক করুন।
            </p>
            <ul className="list-disc list-inside text-xs text-emerald-200/90 space-y-1 pl-2">
              <li>কোনো ZIP ফাইল ডাউনলোড হবে না — সরাসরি <code className="bg-emerald-900/60 px-1 py-0.5 rounded text-white font-mono">.apk</code> ফাইল ডাউনলোড হবে।</li>
              <li>প্লে-স্টোরের জন্য প্রয়োজন হলে <strong className="text-purple-300 font-mono">.AAB</strong> ফরম্যাট ডাউনলোড করতে পারবেন।</li>
              <li>মোবাইল ডাউনলোডের পর নোটিফিকেশন থেকে ট্যাপ করে "Install" দিন। "Install unknown apps" আসলে Allow দিন।</li>
            </ul>
          </div>

          {/* Bengali Quick Guide for Developers */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              ডেভেলপার সোর্স কোড (Android Studio Project ZIP)
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
              <li>যদি সম্পূর্ণ সোর্স কোড মডিফাই করতে চান, তবে <strong>"Source ZIP"</strong> বাটনে ক্লিক করুন।</li>
              <li>জিপ ফাইলটি আনজিপ করুন এবং <strong>Android Studio</strong> দিয়ে ফোল্ডারটি ওপেন করুন।</li>
              <li>গ্র্যাডেল সিঙ্ক হওয়ার পর <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> এ ক্লিক করুন।</li>
            </ol>
          </div>

          {/* Method 1: Android Studio */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                1
              </span>
              Standard Method: Android Studio (GUI)
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p>
                <strong>Step 1:</strong> Download and extract your project ZIP file.
              </p>
              <p>
                <strong>Step 2:</strong> In Android Studio, select <em>File &gt; Open...</em> and select the extracted folder.
              </p>
              <p>
                <strong>Step 3:</strong> Click <em>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</em>.
              </p>
              <p>
                <strong>Step 4:</strong> Android Studio will compile your APK and show a "locate" link in the bottom-right corner.
              </p>
            </div>
          </div>

          {/* Method 2: Command Line */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">
                2
              </span>
              Command Line (Terminal / Mac / Linux / Windows)
            </h4>
            <p className="text-xs text-slate-400">
              In your project folder terminal, execute:
            </p>
            <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-slate-800">
              <code>./gradlew assembleDebug</code>
            </div>
            <p className="text-xs text-slate-500">
              Output will be generated at: <code className="text-slate-300">app/build/outputs/apk/debug/app-debug.apk</code>
            </p>
          </div>

          {/* AdMob & Start.io Notice */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200/90 space-y-1.5">
            <h5 className="font-semibold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Important Notes on Ads (AdMob & Start.io):
            </h5>
            <p>
              - When testing your APK during development, always use Test Ad IDs to avoid account policy violations.
            </p>
            <p>
              - For <strong>Google AdMob</strong>: Ensure your AdMob App ID is verified in your Google AdMob console.
            </p>
            <p>
              - For <strong>Start.io</strong>: Ensure your Start.io App ID is active in your Start.io developer dashboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
