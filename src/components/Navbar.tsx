import React from 'react';
import { Smartphone, Code2, HelpCircle, Sparkles, Layers, Github } from 'lucide-react';
import { AppConfig } from '../types';

interface NavbarProps {
  config: AppConfig;
  onOpenApkModal: (format?: 'apk' | 'aab') => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
  onOpenCodeModal: () => void;
  onOpenGuideModal: () => void;
  onOpenGitHubModal: () => void;
  onLoadPreset: (presetName: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  onOpenApkModal,
  onDownloadZip,
  isDownloading,
  onOpenCodeModal,
  onOpenGuideModal,
  onOpenGitHubModal,
  onLoadPreset,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold shrink-0">
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white truncate">
                Web to APK
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" /> Fullscreen
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              Direct .APK &amp; .AAB Download • AdMob &amp; Start.io Ads Integrated
            </p>
          </div>
        </div>

        {/* Center: Presets */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs text-slate-400">Sample Demos:</span>
          <button
            type="button"
            onClick={() => onLoadPreset('store')}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            E-Commerce
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset('news')}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            News Portal
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset('game')}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            Web Game
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* GitHub APK Build & Mobile Install Button */}
          <button
            type="button"
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-purple-200 bg-purple-950/70 hover:bg-purple-900/90 border border-purple-600/50 rounded-lg shadow-sm transition cursor-pointer"
            title="Build this APK Creator app via GitHub Actions or Install on Phone"
          >
            <Github className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden sm:inline">Build via GitHub</span>
            <span className="sm:hidden text-[11px]">GitHub</span>
          </button>

          <button
            type="button"
            onClick={onOpenGuideModal}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
            title="How to build APK"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={onOpenCodeModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
            title="Inspect Android code"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>View Source</span>
          </button>

          {/* Direct AAB Button */}
          <button
            type="button"
            onClick={() => onOpenApkModal('aab')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-200 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 rounded-lg transition"
            title="Download Google Play Store AAB Bundle"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>.AAB Bundle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
