import { getVirusTotalApiKey } from '@/services/config/api-key-provider';

import type {
  AnalysisStatus,
  EngineFinding,
  EngineTone,
  ScanStats,
  UrlAnalysisResult,
  UrlVerdict,
} from './types';

const API_BASE_URL = 'https://www.virustotal.com/api/v3';
const GUI_BASE_URL = 'https://www.virustotal.com/gui';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 10;

type VirusTotalSubmissionResponse = {
  data?: {
    id?: string;
  };
};

type VirusTotalEngineResult = {
  category?: string;
  result?: string | null;
  method?: string | null;
};

type VirusTotalAnalysisResponse = {
  data?: {
    id: string;
    attributes?: {
      status?: string;
      stats?: Partial<ScanStats>;
      date?: number;
      results?: Record<string, VirusTotalEngineResult>;
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

const keywordPatterns: Array<{ pattern: RegExp; label: string; tone: EngineTone }> = [
  { pattern: /malware|trojan|worm|backdoor/i, label: 'マルウェア検出', tone: 'danger' },
  { pattern: /phishing|credential/i, label: 'フィッシング疑い', tone: 'danger' },
  { pattern: /ransom/i, label: 'ランサムウェア疑い', tone: 'danger' },
  { pattern: /spam|junk/i, label: 'スパムの可能性', tone: 'warning' },
  { pattern: /suspicious|riskware|grayware/i, label: '注意が必要', tone: 'warning' },
  { pattern: /scam|fraud/i, label: '詐欺サイト疑い', tone: 'danger' },
  { pattern: /malicious/i, label: '危険', tone: 'danger' },
];

const translateEngineFinding = (
  engine: string,
  data?: VirusTotalEngineResult,
): EngineFinding | undefined => {
  if (!data) {
    return undefined;
  }

  const category = data.category?.toLowerCase() ?? '';
  const resultText = data.result ?? '';

  let tone: EngineTone = 'info';
  let label = '注意';

  if (category === 'malicious') {
    tone = 'danger';
    label = '危険';
  } else if (category === 'suspicious') {
    tone = 'warning';
    label = '注意が必要';
  }

  for (const entry of keywordPatterns) {
    if (entry.pattern.test(resultText)) {
      tone = entry.tone;
      label = entry.label;
      break;
    }
  }

  if (tone === 'info') {
    return undefined;
  }

  return {
    engine,
    category: category || (tone === 'danger' ? 'malicious' : 'suspicious'),
    categoryLabel: label,
    tone,
    threat: resultText || undefined,
  };
};

const normalizeEngineFindings = (
  results?: Record<string, VirusTotalEngineResult>,
): EngineFinding[] | undefined => {
  if (!results) {
    return undefined;
  }

  const findings = Object.entries(results)
    .map(([engine, value]) => translateEngineFinding(engine, value))
    .filter((finding): finding is EngineFinding => Boolean(finding));

  return findings.length > 0 ? findings : undefined;
};

const normalizeResult = (analysis: VirusTotalAnalysisResponse, submittedUrl: string): UrlAnalysisResult => {
  if (!analysis.data || !analysis.data.id) {
    throw new Error('VirusTotalの解析レスポンスを解釈できませんでした。');
  }

  const stats = normalizeStats(analysis.data.attributes?.stats);
  const status = mapStatus(analysis.data.attributes?.status);
  const engineFindings = normalizeEngineFindings(analysis.data.attributes?.results);

  return {
    id: analysis.data.id,
    provider: 'virusTotal',
    submittedUrl,
    status,
    verdict: mapVerdict(stats),
    stats,
    startedAt: analysis.data.attributes?.date ? analysis.data.attributes?.date * 1000 : undefined,
    detailsUrl: buildDetailsUrl(analysis.data.id),
    engineFindings,
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
