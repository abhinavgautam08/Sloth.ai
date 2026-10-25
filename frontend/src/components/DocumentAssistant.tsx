import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  Clock, 
  ListOrdered, 
  CheckSquare, 
  Calendar, 
  Sliders, 
  FileCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Loader2
} from 'lucide-react';
import { 
  extractDocument, 
  summarizeDocument 
} from '../api';
import type { 
  DocumentExtractResult, 
  SummarizeResult, 
  AIStatus 
} from '../api';

interface DocumentAssistantProps {
  aiStatus: AIStatus | null;
}

export const DocumentAssistant: React.FC<DocumentAssistantProps> = ({ aiStatus }) => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<DocumentExtractResult | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  
  const [mode, setMode] = useState<string>('summary');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(aiStatus?.current_model || 'codellama:latest');
  
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<SummarizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  const isModelReady = aiStatus?.model_available;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSummaryResult(null);
    if (!e.target.files || e.target.files.length === 0) return;
    
    const selectedFile = e.target.files[0];
    
    // Client-side validation
    const validExtensions = ['.txt', '.md', '.pdf'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Please upload a .txt, .md, or .pdf file.`);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
      return;
    }

    setFile(selectedFile);
    setIsExtracting(true);

    try {
      const data = await extractDocument(selectedFile);
      setExtractedData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from document.');
      setExtractedData(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSummarize = async () => {
    if (!extractedData || !extractedData.text) {
      setError('Please upload a document with readable content first.');
      return;
    }

    setError(null);
    setIsSummarizing(true);
    setSummaryResult(null);

    try {
      const res = await summarizeDocument(
        extractedData.text,
        selectedModel || aiStatus?.current_model,
        mode,
        customPrompt
      );
      setSummaryResult(res);
    } catch (err: any) {
      setError(err.message || 'AI summarization failed.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!summaryResult) return;
    navigator.clipboard.writeText(summaryResult.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summaryResult) return;
    const blob = new Blob([summaryResult.summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sloth-summary-${file?.name || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modes = [
    { id: 'summary', label: 'Executive Summary', icon: FileText, desc: 'High-signal overview with key insights' },
    { id: 'key_points', label: 'Key Points', icon: ListOrdered, desc: 'Essential takeaways as bullet points' },
    { id: 'action_items', label: 'Action Checklist', icon: CheckSquare, desc: 'Deliverables, tasks, and assignees' },
    { id: 'dates', label: 'Dates & Deadlines', icon: Calendar, desc: 'Milestones and schedule timelines' },
    { id: 'custom', label: 'Custom Prompt', icon: Sliders, desc: 'Provide tailored synthesis instructions' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>Document Assistant</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
            Local Inference
          </span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Extract text and generate structured insights using open-weight AI on your local machine.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Upload Zone & Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border-2 border-dashed border-zinc-800 hover:border-amber-500/40 bg-zinc-900/40 p-6 text-center transition-all">
            <input
              type="file"
              id="file-upload"
              accept=".txt,.md,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                {isExtracting ? <Loader2 className="w-6 h-6 animate-spin text-amber-400" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-white hover:text-amber-400">
                  {isExtracting ? 'Extracting text securely...' : 'Click to upload document'}
                </span>
                <p className="text-xs text-zinc-500 mt-1">Supports TXT, Markdown, and PDF (Max 10 MB)</p>
              </div>
            </label>
          </div>

          {/* Document Metadata Card */}
          {extractedData && (
            <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-4 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-white font-semibold pb-2 border-b border-white/5">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span className="truncate">{extractedData.filename}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                <div>Type: <span className="text-zinc-200 uppercase font-mono">{extractedData.file_type}</span></div>
                <div>Size: <span className="text-zinc-200 font-mono">{(extractedData.size_bytes / 1024).toFixed(1)} KB</span></div>
                <div>Words: <span className="text-zinc-200 font-mono">{extractedData.word_count.toLocaleString()}</span></div>
                <div>Characters: <span className="text-zinc-200 font-mono">{extractedData.char_count.toLocaleString()}</span></div>
              </div>

              {extractedData.warnings.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  {extractedData.warnings.join(' ')}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="w-full flex items-center justify-between text-zinc-400 hover:text-white pt-2 text-xs cursor-pointer"
              >
                <span>{showRawText ? 'Hide extracted text' : 'View extracted text'}</span>
                {showRawText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRawText && (
                <div className="max-h-40 overflow-y-auto p-2 bg-black/40 rounded border border-white/5 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
                  {extractedData.text.slice(0, 1000)}
                  {extractedData.text.length > 1000 && '... [truncated]'}
                </div>
              )}
            </div>
          )}

          {/* AI Model Selection */}
          <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-4 space-y-2 text-xs">
            <label className="block text-zinc-300 font-medium flex items-center justify-between">
              <span>Target Model</span>
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400 text-xs font-mono"
            >
              {aiStatus?.available_models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {(!aiStatus?.available_models || aiStatus.available_models.length === 0) && (
                <option value={aiStatus?.current_model || 'codellama:latest'}>
                  {aiStatus?.current_model || 'codellama:latest'} (Not downloaded)
                </option>
              )}
            </select>
            <p className="text-[11px] text-zinc-500">
              Inference runs locally using Ollama. No data is sent to the internet.
            </p>
          </div>
        </div>

        {/* Synthesis Options & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Analysis Modes */}
          <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Select Synthesis Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {modes.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all text-xs cursor-pointer ${
                      active
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm shadow-amber-500/5'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-medium">
                      <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span>{m.label}</span>
                    </div>
                    <span className="mt-1 text-[11px] text-zinc-500 leading-normal">{m.desc}</span>
                  </motion.button>
                );
              })}
            </div>

            {mode === 'custom' && (
              <div className="space-y-1 pt-2">
                <label className="text-xs font-medium text-zinc-300">Custom Prompt Instructions</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Highlight technical requirements and list any potential security risks mentioned..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <motion.button
                onClick={handleSummarize}
                disabled={!extractedData || isSummarizing || !isModelReady}
                whileHover={extractedData && !isSummarizing && isModelReady ? { scale: 1.03 } : {}}
                whileTap={extractedData && !isSummarizing && isModelReady ? { scale: 0.97 } : {}}
                className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  !extractedData || isSummarizing || !isModelReady
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-lg shadow-amber-400/20 cursor-pointer'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSummarizing ? 'Synthesizing with Local LLM...' : 'Generate Insights'}</span>
              </motion.button>
            </div>
          </div>

          {/* Results Box */}
          <AnimatePresence mode="wait">
            {summaryResult && (
              <motion.div 
                key="summary-result"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-xl bg-zinc-900/60 border border-amber-500/30 p-6 space-y-4 shadow-xl shadow-black/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-white">AI Analysis Output</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      {summaryResult.model_used}
                    </span>
                    {summaryResult.strategy && (
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                        summaryResult.strategy === 'map_reduce'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {summaryResult.strategy === 'map_reduce'
                          ? `Map-Reduce (${summaryResult.total_chunks || 2} Chunks)`
                          : 'Single Shot'}
                      </span>
                    )}
                    <span className="flex items-center space-x-1 text-zinc-400 text-[11px]">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{(summaryResult.processing_time_ms / 1000).toFixed(2)}s</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={handleCopy}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </motion.button>

                    <motion.button
                      onClick={handleDownload}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save .md</span>
                    </motion.button>
                  </div>
                </div>

                {/* Local Privacy & Latency Notice */}
                <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                  <span>🔒 Processed strictly locally via Ollama. No data left this machine.</span>
                  <span className="hidden sm:inline text-zinc-600">Local inference speed varies with GPU/CPU hardware.</span>
                </div>

                {/* Rendered Summary Text */}
                <div className="text-zinc-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans bg-black/20 p-4 rounded-lg border border-white/5">
                  {summaryResult.summary}
                </div>
              </motion.div>
            )}

            {/* Active Progress State */}
            {isSummarizing && (
              <motion.div 
                key="summarizing-progress"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-xl bg-zinc-900/60 border border-amber-500/30 p-8 text-center space-y-3 shadow-xl shadow-black/40"
              >
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-400" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">Local AI Synthesis in Progress...</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Running entirely on local CPU/GPU hardware via Ollama using model <span className="text-amber-300 font-mono">{selectedModel || aiStatus?.current_model}</span>. Zero bytes leave your workstation.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Depending on document length and system hardware, local inference typically takes 15–75 seconds.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Empty state when no analysis yet */}
            {!summaryResult && !isSummarizing && (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 p-12 text-center text-zinc-500 text-xs"
              >
                <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p>Upload a document on the left and click "Generate Insights" to preview the synthesized output.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
