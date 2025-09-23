export type UrlVerdict = 'safe' | 'warning' | 'danger' | 'unknown';

export type AnalysisStatus = 'queued' | 'in-progress' | 'completed' | 'failed';

export interface ScanStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
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
  raw?: unknown;
}
