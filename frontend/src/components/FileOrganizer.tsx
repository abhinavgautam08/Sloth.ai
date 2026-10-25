import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  History,
  X,
  RotateCcw,
  Undo2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  scanDirectory, 
  applyOrganizerOperations, 
  fetchOrganizerHistory,
  previewUndo,
  applyUndo
} from '../api';
import type { 
  ScanResult, 
  ApplyOperationsResult,
  BatchHistoryItem,
  UndoPreviewResponse,
  UndoApplyResponse
} from '../api';

export const FileOrganizer: React.FC = () => {
  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [overwriteStrategy, setOverwriteStrategy] = useState<'skip' | 'rename' | 'overwrite'>('rename');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applyResult, setApplyResult] = useState<ApplyOperationsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History & Undo states
  const [history, setHistory] = useState<BatchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [undoPreviewData, setUndoPreviewData] = useState<UndoPreviewResponse | null>(null);
  const [isPreviewingUndo, setIsPreviewingUndo] = useState<boolean>(false);
  const [undoConfirmed, setUndoConfirmed] = useState<boolean>(false);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);
  const [undoApplyResult, setUndoApplyResult] = useState<UndoApplyResponse | null>(null);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!directoryPath.trim()) {
      setError('Please provide a valid directory path to scan.');
      return;
    }

    setError(null);
    setScanResult(null);
    setApplyResult(null);
    setIsScanning(true);

    try {
      const res = await scanDirectory(directoryPath.trim());
      setScanResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to scan directory.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = async () => {
    if (!scanResult || scanResult.proposed_moves.length === 0) {
      setError('No proposed moves available to apply.');
      return;
    }

    if (!dryRun && !confirmed) {
      setError('Please check the confirmation box before applying real changes to disk.');
      return;
    }

    setError(null);
    setIsApplying(true);

    try {
      const res = await applyOrganizerOperations(
        scanResult.directory_path,
        scanResult.proposed_moves,
        dryRun,
        overwriteStrategy,
        confirmed
      );
      setApplyResult(res);
      // If real move succeeded, re-scan to show current directory status
      if (!dryRun) {
        setConfirmed(false);
        const refreshed = await scanDirectory(scanResult.directory_path);
        setScanResult(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply file operations.');
    } finally {
      setIsApplying(false);
    }
  };

  const loadHistory = async () => {
    setError(null);
    try {
      const hist = await fetchOrganizerHistory();
      setHistory(hist);
      setShowHistory(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history.');
    }
  };

  const handleOpenUndoPreview = async (batchId: string) => {
    setError(null);
    setSelectedBatchId(batchId);
    setUndoPreviewData(null);
    setUndoApplyResult(null);
    setUndoConfirmed(false);
    setIsPreviewingUndo(true);

    try {
      const preview = await previewUndo(batchId);
      setUndoPreviewData(preview);
    } catch (err: any) {
      setError(err.message || 'Failed to generate undo preview.');
      setSelectedBatchId(null);
    } finally {
      setIsPreviewingUndo(false);
    }
  };

  const handleExecuteUndo = async () => {
    if (!selectedBatchId) return;
    if (!undoConfirmed) {
      setError('Please check the confirmation box to authorize reverting file operations.');
      return;
    }

    setError(null);
    setIsUndoing(true);

    try {
      const res = await applyUndo(selectedBatchId, true);
      setUndoApplyResult(res);
      // Refresh history list
      const updatedHist = await fetchOrganizerHistory();
      setHistory(updatedHist);
      // If active scan matches, refresh it
      if (scanResult) {
        const refreshed = await scanDirectory(scanResult.directory_path);
        setScanResult(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute rollback.');
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>Safe File Organizer</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Zero-Loss Guard
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Categorize messy directories with SQLite audit logs, rollback protection, and dry-run safety.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-800 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Audit History & Undo</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Path Input Form */}
      <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 space-y-4">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={directoryPath}
              onChange={(e) => setDirectoryPath(e.target.value)}
              placeholder="Enter absolute directory path (e.g. F:\Hackfest\organizer_sandbox)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-400/20 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{isScanning ? 'Scanning...' : 'Scan Directory'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="text-zinc-500">Quick sandbox test:</span>
          <button
            type="button"
            onClick={() => {
              setDirectoryPath('F:\\Hackfest\\organizer_sandbox');
            }}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] cursor-pointer"
          >
            F:\Hackfest\organizer_sandbox
          </button>
        </div>
      </div>

      {/* Scan Results and Proposed Moves */}
      {scanResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-4">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Total Files</span>
              <div className="text-xl font-bold text-white mt-1">{scanResult.total_files}</div>
            </div>

            {Object.entries(scanResult.categories_summary).slice(0, 3).map(([cat, count]) => (
              <div key={cat} className="rounded-xl bg-zinc-900/40 border border-white/5 p-4">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold truncate block">{cat}</span>
                <div className="text-xl font-bold text-amber-400 mt-1">{count}</div>
              </div>
            ))}
          </div>

          {/* Controls Bar: Dry Run & Conflict Strategy */}
          <div className="rounded-xl bg-zinc-900/60 border border-white/5 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Dry-run Toggle */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Execution Mode</span>
                </span>
                <label className="flex items-center space-x-2 cursor-pointer text-zinc-300 pt-1">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-amber-400 focus:ring-amber-400/20"
                  />
                  <span>Dry Run (Simulate without touching disk)</span>
                </label>
              </div>

              {/* Overwrite Strategy */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <span className="font-semibold text-white">Collision Strategy</span>
                <select
                  value={overwriteStrategy}
                  onChange={(e) => setOverwriteStrategy(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="rename">Auto Rename (e.g. file (1).txt)</option>
                  <option value="skip">Skip on Conflict</option>
                  <option value="overwrite">Overwrite Destination</option>
                </select>
              </div>

              {/* Confirmation and Action */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-2">
                <span className="font-semibold text-white">Safety Confirmation</span>
                {!dryRun ? (
                  <label className="flex items-center space-x-2 cursor-pointer text-amber-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-400"
                    />
                    <span>I authorize real filesystem moves</span>
                  </label>
                ) : (
                  <span className="text-[11px] text-zinc-500">Dry-run active — safe to test</span>
                )}

                <button
                  onClick={handleApply}
                  disabled={isApplying || (!dryRun && !confirmed)}
                  className={`w-full py-2 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all ${
                    isApplying || (!dryRun && !confirmed)
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-400/20 cursor-pointer'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isApplying ? 'Applying...' : dryRun ? 'Run Simulation' : 'Execute Organization'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Proposed Moves Table */}
          <div className="rounded-xl bg-zinc-900/60 border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Proposed File Relocations</h2>
              <span className="text-xs text-zinc-400">{scanResult.proposed_moves.length} files to organize</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Target Folder</th>
                    <th className="p-3">Conflict Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scanResult.proposed_moves.map((m, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/20 text-zinc-300">
                      <td className="p-3 font-mono font-medium text-white truncate max-w-xs">{m.filename}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 text-[11px]">
                          {m.category}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">{m.suggested_folder}</td>
                      <td className="p-3">
                        {m.has_conflict ? (
                          <span className="inline-flex items-center space-x-1 text-amber-400">
                            <AlertCircle className="w-3 h-3" />
                            <span>Name Conflict</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Path Clear</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results View */}
      {applyResult && (
        <div className="rounded-xl bg-zinc-900/60 border border-amber-500/20 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Execution Outcome ({applyResult.dry_run ? 'Simulation' : 'Live Real Moves'})</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Processed {applyResult.total_processed} items. Succeeded: {applyResult.succeeded}, Skipped: {applyResult.skipped}, Failed: {applyResult.failed}.
              </p>
            </div>

            {!applyResult.dry_run && applyResult.batch_id && (
              <button
                onClick={() => handleOpenUndoPreview(applyResult.batch_id!)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs border border-zinc-700 cursor-pointer transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo This Move</span>
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs font-mono">
            {applyResult.results.map((r, i) => (
              <div 
                key={i} 
                className={`p-2.5 rounded flex items-center justify-between ${
                  r.success ? 'bg-zinc-950/60 text-zinc-300 border border-white/5' : 'bg-rose-950/30 text-rose-300 border border-rose-500/20'
                }`}
              >
                <span className="truncate max-w-md">{r.message}</span>
                <span className="text-[10px] text-zinc-500 uppercase shrink-0 ml-2">{r.action_taken}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History & Undo Drawer/Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Persistent SQLite Operation History & Safe Undo</h3>
                </div>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedBatchId(null);
                  setUndoPreviewData(null);
                  setUndoApplyResult(null);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Batches */}
            {!selectedBatchId ? (
              <div className="max-h-96 overflow-y-auto space-y-2.5">
                {history.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">No operation history found in SQLite database.</p>
                ) : (
                  history.map((h) => {
                    const isLive = !h.dry_run;
                    const canRollback = isLive && (h.status === 'applied' || h.status === 'partially_failed');
                    return (
                      <div key={h.batch_id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] text-zinc-400">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              h.status === 'applied' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              h.status === 'undone' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              h.status === 'simulated' ? 'bg-zinc-800 text-zinc-400' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {h.status}
                            </span>
                          </div>

                          {canRollback && (
                            <button
                              onClick={() => handleOpenUndoPreview(h.batch_id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-medium cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Preview Undo</span>
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-zinc-500 truncate">
                          Path: {h.directory_path}
                        </div>
                        <div className="text-zinc-400 text-[11px] flex space-x-4">
                          <span>Total: {h.total_processed}</span>
                          <span className="text-emerald-400">Succeeded: {h.succeeded}</span>
                          <span className="text-amber-400">Skipped: {h.skipped}</span>
                          <span className="text-rose-400">Failed: {h.failed}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Undo Preview & Confirmation Panel */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <button
                    onClick={() => {
                      setSelectedBatchId(null);
                      setUndoPreviewData(null);
                      setUndoApplyResult(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    <span>← Back to batch list</span>
                  </button>
                  <span className="text-xs text-zinc-500 font-mono">Batch: {selectedBatchId.slice(0, 8)}...</span>
                </div>

                {isPreviewingUndo && (
                  <div className="flex items-center justify-center py-8 space-x-2 text-zinc-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Verifying filesystem status and conflict safety...</span>
                  </div>
                )}

                {undoPreviewData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px] uppercase">Total Files</span>
                        <span className="text-base font-bold text-white">{undoPreviewData.total_items}</span>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px] uppercase">Safe to Restore</span>
                        <span className="text-base font-bold text-emerald-400">{undoPreviewData.can_undo_count}</span>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px] uppercase">Blocked / Conflict</span>
                        <span className="text-base font-bold text-rose-400">{undoPreviewData.conflict_count}</span>
                      </div>
                    </div>

                    {undoPreviewData.conflict_count > 0 && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                        <div className="font-semibold flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Safety Protection Notice</span>
                        </div>
                        <p className="text-[11px] text-rose-300/90">
                          Sloth.ai refuses to overwrite existing files at original locations. Blocked files will remain safe at their current locations.
                        </p>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="max-h-56 overflow-y-auto space-y-1 text-xs font-mono">
                      {undoPreviewData.items.map((item) => (
                        <div
                          key={item.op_id}
                          className={`p-2.5 rounded border flex items-center justify-between ${
                            item.can_undo
                              ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
                              : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                          }`}
                        >
                          <div className="truncate max-w-sm">
                            <span className="font-semibold">{item.filename}</span>
                            <div className="text-[10px] text-zinc-500 truncate">
                              Restore to: {item.original_path}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {item.can_undo ? (
                              <span className="text-emerald-400 text-[10px] font-semibold uppercase">Clear to Restore</span>
                            ) : (
                              <span className="text-rose-400 text-[10px] font-semibold">{item.reason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Confirmation Checkbox & Action Button */}
                    {!undoApplyResult && (
                      <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                        <label className="flex items-start space-x-2.5 text-xs text-amber-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={undoConfirmed}
                            onChange={(e) => setUndoConfirmed(e.target.checked)}
                            className="rounded bg-zinc-900 border-zinc-700 text-amber-400 mt-0.5"
                          />
                          <span>
                            I confirm that I want to rollback these files to their original directories.
                          </span>
                        </label>

                        <button
                          onClick={handleExecuteUndo}
                          disabled={!undoConfirmed || isUndoing || undoPreviewData.can_undo_count === 0}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                            !undoConfirmed || isUndoing || undoPreviewData.can_undo_count === 0
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-lg shadow-amber-400/20 cursor-pointer'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isUndoing ? 'Executing Rollback...' : 'Execute Confirmed Rollback'}</span>
                        </button>
                      </div>
                    )}

                    {/* Undo Execution Result */}
                    {undoApplyResult && (
                      <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Rollback Execution Completed</span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Succeeded: {undoApplyResult.succeeded} | Failed: {undoApplyResult.failed}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono">
                          {undoApplyResult.results.map((r, i) => (
                            <div key={i} className={`p-1.5 rounded ${r.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {r.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
