import React from 'react';
import { Bot, FileText, FolderTree, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import type { AIStatus } from '../api';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  aiStatus: AIStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, aiStatus }) => {
  const isOnline = aiStatus?.ollama_available;
  const isModelReady = aiStatus?.model_available;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Bot },
    { id: 'documents', label: 'Document Assistant', icon: FileText },
    { id: 'organizer', label: 'File Organizer', icon: FolderTree },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setCurrentTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors shadow-lg shadow-amber-500/10">
            <span className="text-xl select-none">🦥</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Sloth<span className="text-amber-400">.ai</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Phase 1 MVP
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 tracking-wide">Slow and Steady • Privacy-First AI</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/5'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Runtime Status Badge */}
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => setCurrentTab('settings')}
            className={`cursor-pointer flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !isOnline
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : isModelReady
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title={aiStatus?.message || 'AI Runtime Status'}
          >
            <div className="relative flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${
                !isOnline ? 'bg-rose-400' : isModelReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
            </div>
            <span className="hidden sm:inline font-mono">
              {!isOnline
                ? 'Ollama Offline'
                : isModelReady
                ? aiStatus?.current_model || 'Local Model Ready'
                : 'Model Missing'}
            </span>
          </div>

          <div 
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400"
            title="Privacy Shield: All processing is local"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline text-[11px]">100% Local</span>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around border-t border-white/5 bg-zinc-950/80 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
                active ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
