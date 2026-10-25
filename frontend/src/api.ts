export interface ModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
  parameter_size?: string;
  family?: string;
}

export interface AIStatus {
  ollama_available: boolean;
  ollama_host: string;
  current_model: string;
  model_available: boolean;
  available_models: string[];
  models_details: ModelInfo[];
  message: string;
  setup_guidance?: string | null;
}

export interface DocumentExtractResult {
  filename: string;
  file_type: string;
  size_bytes: number;
  char_count: number;
  word_count: number;
  text: string;
  warnings: string[];
}

export interface SummarizeResult {
  summary: string;
  key_points: string[];
  action_items: string[];
  dates: string[];
  model_used: string;
  processing_time_ms: number;
  is_mocked: boolean;
  strategy?: "single_shot" | "map_reduce";
  total_chunks?: number;
  chunks_processed?: number;
  max_chunk_chars?: number;
}

export interface ProposedFileMove {
  original_path: string;
  filename: string;
  file_size: number;
  extension: string;
  category: string;
  suggested_folder: string;
  proposed_path: string;
  has_conflict: boolean;
  status: string;
  error_message?: string;
}

export interface ScanResult {
  directory_path: string;
  total_files: number;
  categories_summary: Record<string, number>;
  proposed_moves: ProposedFileMove[];
  warnings: string[];
}

export interface OperationResult {
  original_path: string;
  destination_path: string;
  action_taken: string;
  success: boolean;
  message: string;
}

export interface ApplyOperationsResult {
  batch_id?: string;
  dry_run: boolean;
  total_processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: OperationResult[];
  timestamp: string;
}

export interface BatchHistoryItem {
  batch_id: string;
  directory_path: string;
  timestamp: string;
  dry_run: boolean;
  overwrite_strategy: string;
  total_processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  status: string;
}

export interface UndoItemPreview {
  op_id: number;
  original_path: string;
  destination_path: string;
  filename: string;
  can_undo: boolean;
  reason?: string;
}

export interface UndoPreviewResponse {
  batch_id: string;
  directory_path: string;
  total_items: number;
  can_undo_count: number;
  conflict_count: number;
  items: UndoItemPreview[];
}

export interface UndoItemResult {
  op_id: number;
  original_path: string;
  destination_path: string;
  success: boolean;
  message: string;
}

export interface UndoApplyResponse {
  batch_id: string;
  total_attempted: number;
  succeeded: number;
  failed: number;
  results: UndoItemResult[];
  timestamp: string;
}

const API_BASE = "/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchAIStatus(): Promise<AIStatus> {
  const res = await fetch(`${API_BASE}/ai/status`);
  if (!res.ok) throw new Error(`AI status check failed: HTTP ${res.status}`);
  return res.json();
}

export async function configureAI(model?: string, host?: string): Promise<AIStatus> {
  const res = await fetch(`${API_BASE}/ai/configure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, ollama_host: host }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `AI configuration failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function extractDocument(file: File): Promise<DocumentExtractResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/documents/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Document extraction failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function summarizeDocument(
  text: string,
  model?: string,
  mode: string = "summary",
  customInstructions?: string,
  maxChunkChars?: number
): Promise<SummarizeResult> {
  const res = await fetch(`${API_BASE}/documents/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model,
      mode,
      custom_instructions: customInstructions,
      max_chunk_chars: maxChunkChars,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Summarization failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function scanDirectory(directoryPath: string, useAi: boolean = false): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/organizer/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directory_path: directoryPath,
      use_ai_classification: useAi,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Directory scan failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function applyOrganizerOperations(
  directoryPath: string,
  operations: ProposedFileMove[],
  dryRun: boolean = true,
  overwriteStrategy: "skip" | "rename" | "overwrite" = "rename",
  confirm: boolean = false
): Promise<ApplyOperationsResult> {
  const res = await fetch(`${API_BASE}/organizer/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directory_path: directoryPath,
      operations,
      dry_run: dryRun,
      overwrite_strategy: overwriteStrategy,
      confirm,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `File organizer failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOrganizerHistory(): Promise<BatchHistoryItem[]> {
  const res = await fetch(`${API_BASE}/organizer/history`);
  if (!res.ok) throw new Error("Failed to fetch organizer history");
  return res.json();
}

export async function previewUndo(batchId: string): Promise<UndoPreviewResponse> {
  const res = await fetch(`${API_BASE}/organizer/undo/preview?batch_id=${encodeURIComponent(batchId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Undo preview failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function applyUndo(batchId: string, confirm: boolean = true): Promise<UndoApplyResponse> {
  const res = await fetch(`${API_BASE}/organizer/undo/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batch_id: batchId, confirm }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Undo execution failed: HTTP ${res.status}`);
  }
  return res.json();
}
