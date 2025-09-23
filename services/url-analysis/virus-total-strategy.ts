import { getVirusTotalApiKey } from '@/services/config/api-key-provider';

import type { AnalysisStatus, ScanStats, UrlAnalysisResult, UrlVerdict } from './types';

const API_BASE_URL = 'https://www.virustotal.com/api/v3';
const GUI_BASE_URL = 'https://www.virustotal.com/gui';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 10;

type VirusTotalSubmissionResponse = {
  data?: {
    id?: string;
  };
};

type VirusTotalAnalysisResponse = {
  data?: {
    id: string;
    attributes?: {
      status?: string;
      stats?: Partial<ScanStats>;
      date?: number;
    };
  };
};

const normalizeStats = (stats?: Partial<ScanStats>): ScanStats => ({
  harmless: stats?.harmless ?? 0,
  malicious: stats?.malicious ?? 0,
  suspicious: stats?.suspicious ?? 0,
  undetected: stats?.undetected ?? 0,
  timeout: stats?.timeout ?? 0,
});

const mapStatus = (status?: string): AnalysisStatus => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'queued':
      return 'queued';
    case 'running':
    case 'in-progress':
      return 'in-progress';
    case 'failed':
      return 'failed';
    default:
      return 'in-progress';
  }
};

const mapVerdict = ({ malicious, suspicious, harmless }: ScanStats): UrlVerdict => {
  if (malicious > 0) {
    return 'danger';
  }
  if (suspicious > 0) {
    return 'warning';
  }
  if (harmless > 0) {
    return 'safe';
  }
  return 'unknown';
};

const buildDetailsUrl = (analysisId: string) => `${GUI_BASE_URL}/url-analysis/${encodeURIComponent(analysisId)}`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.message) {
      return payload.message;
    }
    return `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
};

const normalizeResult = (analysis: VirusTotalAnalysisResponse, submittedUrl: string): UrlAnalysisResult => {
  if (!analysis.data || !analysis.data.id) {
    throw new Error('VirusTotalの解析レスポンスを解釈できませんでした。');
  }

  const stats = normalizeStats(analysis.data.attributes?.stats);
  const status = mapStatus(analysis.data.attributes?.status);

  return {
    id: analysis.data.id,
    provider: 'virusTotal',
    submittedUrl,
    status,
    verdict: mapVerdict(stats),
    stats,
    startedAt: analysis.data.attributes?.date ? analysis.data.attributes?.date * 1000 : undefined,
    detailsUrl: buildDetailsUrl(analysis.data.id),
    raw: analysis,
  };
};

export const analyzeViaVirusTotal = async (url: string): Promise<UrlAnalysisResult> => {
  const apiKey = getVirusTotalApiKey();

  if (!apiKey) {
    throw new Error(
      'VirusTotal APIキーが設定されていません。config/local-api-keys.json を更新してください。',
    );
  }

  const submissionResponse = await fetch(`${API_BASE_URL}/urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-apikey': apiKey,
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  if (!submissionResponse.ok) {
    throw new Error(`URLの解析リクエストに失敗しました: ${await extractError(submissionResponse)}`);
  }

  const submissionJson = (await submissionResponse.json()) as VirusTotalSubmissionResponse;
  const analysisId = submissionJson.data?.id;

  if (!analysisId) {
    throw new Error('VirusTotal の解析IDを取得できませんでした。');
  }

  const fetchAnalysis = async (): Promise<VirusTotalAnalysisResponse> => {
    const response = await fetch(`${API_BASE_URL}/analyses/${analysisId}`, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`解析結果の取得に失敗しました: ${await extractError(response)}`);
    }

    return (await response.json()) as VirusTotalAnalysisResponse;
  };

  let analysisJson = await fetchAnalysis();
  let result = normalizeResult(analysisJson, url);
  let attempts = 0;

  while (
    (result.status === 'in-progress' || result.status === 'queued') &&
    attempts < MAX_POLL_ATTEMPTS
  ) {
    await delay(POLL_INTERVAL_MS);
    analysisJson = await fetchAnalysis();
    result = normalizeResult(analysisJson, url);
    attempts += 1;
  }

  return result;
};
