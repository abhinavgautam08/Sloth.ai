import React, { useState } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Copy, 
  Terminal, 
  CheckCircle2,
  WifiOff
} from 'lucide-react';
import { configureAI } from '../api';
import type { AIStatus } from '../api';

interface SettingsViewProps {
  aiStatus: AIStatus | null;
  onRefreshStatus: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ aiStatus, onRefreshStatus }) => {
  const [host, setHost] = useState<string>(aiStatus?.ollama_host || 'http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState<string>(aiStatus?.current_model || 'codellama:latest');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await configureAI(selectedModel, host);
      await onRefreshStatus();
      setSaveMessage('AI configuration updated and verified successfully.');
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const modelsList = [
    { name: 'llama3.2', desc: 'Meta Llama 3.2 (3B) - Ultra-fast, lightweight, ideal for laptops', pull: 'ollama run llama3.2' },
    { name: 'codellama', desc: 'Code Llama (7B) - Specialized for structured logic and coding tasks', pull: 'ollama run codellama' },
    { name: 'mistral', desc: 'Mistral (7B) - High reasoning performance across diverse text', pull: 'ollama run mistral' },
    { name: 'phi3', desc: 'Microsoft Phi-3 Mini (3.8B) - Compact and highly capable instruction model', pull: 'ollama run phi3' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>Settings & Runtime Configuration</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure local open-weight inference, inspect connected hardware, and verify data privacy guards.
        </p>
      </div>

      {/* Ollama Connection & Model Config */}
      <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Local Inference Engine</h2>
              <p className="text-xs text-zinc-400">Manage Ollama server endpoint and target model</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${aiStatus?.ollama_available ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-xs font-mono text-zinc-300">
              {aiStatus?.ollama_available ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Ollama Host URL</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Active Open-Weight Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
              >
                {aiStatus?.available_models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {(!aiStatus?.available_models || aiStatus.available_models.length === 0) && (
                  <option value={selectedModel}>{selectedModel} (Needs download)</option>
                )}
              </select>
            </div>
          </div>

          {saveMessage && (
            <div className={`p-3 rounded-lg text-xs ${
              saveMessage.startsWith('Error') 
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' 
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            }`}>
              {saveMessage}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onRefreshStatus}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <span>{isSaving ? 'Verifying...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Model Setup Guide */}
      <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-6 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>Recommended Open-Weight Models</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Open a terminal on your computer and execute any of the following commands to download a local model.
          <strong> Notice on connectivity:</strong> The initial model pull requires an internet connection; once downloaded to your local drive, all subsequent inference functions 100% offline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {modelsList.map((m) => (
            <div key={m.name} className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-300">{m.name}</span>
                <button
                  onClick={() => copyToClipboard(m.pull, m.name)}
                  className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                >
                  {copiedCmd === m.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd === m.name ? 'Copied' : 'Copy command'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">{m.desc}</p>
              <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-zinc-300 select-all">
                {m.pull}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Architecture Guarantee */}
      <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-6 space-y-4">
        <div className="flex items-center space-x-2 text-white font-semibold text-sm">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Privacy & Architecture Guarantee</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero External Transmission</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Uploaded documents and summaries remain strictly in memory or on your local disk. No prompts or documents are ever uploaded to cloud AI providers.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-white/5 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium">
              <WifiOff className="w-4 h-4" />
              <span>True Offline Capability</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Once Ollama has downloaded your chosen model, Sloth.ai can run completely unplugged from the internet — ideal for air-gapped workstations or travel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
