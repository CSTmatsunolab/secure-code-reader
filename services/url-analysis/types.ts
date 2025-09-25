export type UrlVerdict = 'safe' | 'warning' | 'danger' | 'unknown';

export type AnalysisStatus = 'queued' | 'in-progress' | 'completed' | 'failed';

export interface ScanStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

export type EngineTone = 'danger' | 'warning' | 'info';

export interface EngineFinding {
  engine: string;
  category: string;
  categoryLabel: string;
  tone: EngineTone;
  threat?: string;
}

export interface InternalListResult {
  listed: boolean;
  serviceName: string | null;
  category: string | null;
  notice: string | null;
}

export interface UrlAnalysisResult {
  id: string;
  provider: 'virusTotal' | 'bff';
  submittedUrl: string;
  status: AnalysisStatus;
  verdict: UrlVerdict;
  stats: ScanStats;
  startedAt?: number;
  detailsUrl?: string;
  engineFindings?: EngineFinding[];
  internalListResult?: InternalListResult;
  raw?: unknown;
}
