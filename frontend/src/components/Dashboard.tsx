import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  FileText, 
  FolderTree, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import type { AIStatus } from '../api';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  aiStatus: AIStatus | null;
}

import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
    },
  },
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, aiStatus }) => {
  const isOnline = aiStatus?.ollama_available;
  const isModelReady = aiStatus?.model_available;
  const heroGlowRef = useRef<HTMLDivElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroGlowRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(heroGlowRef.current, {
        scale: 1.3,
        opacity: 0.45,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, heroCardRef);

    return () => ctx.revert();
  }, []);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div 
        ref={heroCardRef}
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-amber-500/20 p-8 shadow-xl shadow-black/40"
      >
        <div 
          ref={heroGlowRef}
          className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" 
        />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hacktoberfest 2026: “Slow and Steady” Open-Source AI Challenge</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">Sloth.ai</span>.
            <br />
            Meticulous, Privacy-First Productivity.
          </h1>
          
          <p className="mt-4 text-base text-zinc-300 leading-relaxed">
            Why send sensitive personal documents to paid proprietary APIs when deliberate, open-weight local intelligence can summarize notes, extract action items, and declutter your local filesystem securely on your own machine?
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <motion.button
              onClick={() => onNavigate('documents')}
              whileHover={{ scale: 1.03, boxShadow: '0 10px 25px -5px rgba(251, 191, 36, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-bold hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 text-sm cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Launch Document Assistant</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </motion.button>

            <motion.button
              onClick={() => onNavigate('organizer')}
              whileHover={{ scale: 1.03, borderColor: 'rgba(251, 191, 36, 0.4)' }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium border border-zinc-700 transition-colors text-sm cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Organize Local Files</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Status & Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Local AI Engine Tile */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.3)' }}
          className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Local AI Engine</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isModelReady ? 'bg-emerald-400' : isOnline ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <span className="text-lg font-bold text-white">
                {isModelReady ? 'Operational' : isOnline ? 'Model Missing' : 'Offline'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400 truncate">
              {isOnline ? `Model: ${aiStatus?.current_model}` : 'Ollama not detected'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-500 flex justify-between">
            <span>Runtime</span>
            <span className="text-zinc-300 font-mono">Ollama Local</span>
          </div>
        </motion.div>

        {/* Document Assistant Tile */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.3)' }}
          className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Document Parser</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">TXT, MD, PDF</div>
            <p className="mt-1 text-xs text-zinc-400">Safe in-memory extraction</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-500 flex justify-between">
            <span>Size Limit</span>
            <span className="text-zinc-300 font-mono">10 MB max</span>
          </div>
        </motion.div>

        {/* File Organizer Tile */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.3)' }}
          className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Safety Guard</span>
            <FolderTree className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">Dry-Run First</div>
            <p className="mt-1 text-xs text-zinc-400">Zero automatic deletions</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-500 flex justify-between">
            <span>Conflicts</span>
            <span className="text-zinc-300 font-mono">Auto-rename (1)</span>
          </div>
        </motion.div>

        {/* Privacy Shield Tile */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.3)' }}
          className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Privacy Shield</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white">Local Sandbox</div>
            <p className="mt-1 text-xs text-zinc-400">Zero cloud telemetry</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-500 flex justify-between">
            <span>Network</span>
            <span className="text-zinc-300 font-mono">100% Localhost</span>
          </div>
        </motion.div>
      </div>

      {/* Model Setup Banner if offline */}
      {!isModelReady && (
        <motion.div 
          variants={itemVariants}
          className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                {!isOnline ? 'Ollama runtime is not connected' : `Model '${aiStatus?.current_model}' needs installation`}
              </h3>
              <p className="text-xs text-amber-300/80 mt-1">
                {aiStatus?.setup_guidance || 'Make sure Ollama is installed and run `ollama serve`.'}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => onNavigate('settings')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-lg bg-amber-400 text-zinc-950 text-xs font-bold hover:bg-amber-300 shrink-0 cursor-pointer"
          >
            Open Setup Guide
          </motion.button>
        </motion.div>
      )}

      {/* Feature Highlights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Workflow Card */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.25)' }}
          className="rounded-xl bg-zinc-900/40 border border-white/5 p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Document Synthesis & Analysis</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Upload plain text, Markdown notes, or PDF documents. Sloth.ai extracts their textual content safely in-memory and invokes your local open-weight LLM to generate structured summaries, highlight key points, and compile actionable checklists.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-zinc-300">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Multi-format support (TXT, MD, PDF)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Targeted extraction modes (Key Points, Action Items, Dates)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom user prompting and instant clipboard copy</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Explore Document Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* File Organizer Card */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, borderColor: 'rgba(251, 191, 36, 0.25)' }}
          className="rounded-xl bg-zinc-900/40 border border-white/5 p-6 transition-colors flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-4">
              <FolderTree className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Safe Local File Organizer</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Tame cluttered desktop and downloads folders without risking file loss. Sloth.ai classifies files into structured subfolders, renders a complete interactive preview, and supports a verifiable Dry-Run mode before moving a single file.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-zinc-300">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Non-destructive dry-run preview mode</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Intelligent conflict resolution (auto-rename suffix)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Strict system path protection and explicit user confirmation</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => onNavigate('organizer')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Launch File Organizer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
