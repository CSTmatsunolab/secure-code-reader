import { getBffApiKey } from '@/services/config/api-key-provider';
import type {
  AnalysisStatus,
  EngineFinding,
  EngineTone,
  InternalListResult,
  ScanStats,
  UrlAnalysisResult,
  UrlVerdict,
} from './types';

const GUI_BASE_URL = 'https://www.virustotal.com/gui';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 10;

type BffSubmissionResponse = {
  data?: {
    id?: string;
  };
};

type BffEngineResult = {
  category?: string;
  result?: string | null;
  method?: string | null;
};

type BffAnalysisResponse = {
  data?: {
    id: string;
    attributes?: {
      status?: string;
      stats?: Partial<ScanStats>;
      date?: number;
      results?: Record<string, BffEngineResult>;
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
  data?: BffEngineResult,
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
  results?: Record<string, BffEngineResult>,
): EngineFinding[] | undefined => {
  if (!results) {
    return undefined;
  }

  const findings = Object.entries(results)
    .map(([engine, value]) => translateEngineFinding(engine, value))
    .filter((finding): finding is EngineFinding => Boolean(finding));

  return findings.length > 0 ? findings : undefined;
};

// 内部リスト照会（DynamoDB）
const checkInternalList = async (
  url: string,
  baseUrl: string,
  headers: Record<string, string>,
): Promise<InternalListResult | undefined> => {
  try {
    const response = await fetch(`${baseUrl}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn(`内部リスト照会に失敗: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const result = (await response.json()) as InternalListResult;
    return result;
  } catch (error) {
    console.warn('内部リスト照会でエラー:', error);
    return undefined;
  }
};

const normalizeResult = (analysis: BffAnalysisResponse, submittedUrl: string, internalListResult?: InternalListResult): UrlAnalysisResult => {
  if (!analysis.data || !analysis.data.id) {
    throw new Error('BFFの解析レスポンスを解釈できませんでした。');
  }

  const stats = normalizeStats(analysis.data.attributes?.stats);
  const status = mapStatus(analysis.data.attributes?.status);
  const engineFindings = normalizeEngineFindings(analysis.data.attributes?.results);

  return {
    id: analysis.data.id,
    provider: 'bff',
    submittedUrl,
    status,
    verdict: mapVerdict(stats),
    stats,
    startedAt: analysis.data.attributes?.date ? analysis.data.attributes?.date * 1000 : undefined,
    detailsUrl: buildDetailsUrl(analysis.data.id),
    engineFindings,
    internalListResult,
    raw: analysis,
  };
};

export async function analyzeViaBff(url: string, baseUrl: string): Promise<UrlAnalysisResult> {
  const buildBffHeaders = (base?: Record<string, string>) => {
  const headers: Record<string, string> = { ...(base ?? {}) };
  const apiKey = getBffApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
  };
  // 1. URLスキャン作成
  const submissionResponse = await fetch(`${baseUrl}/urls`, {
  method: 'POST',
  headers: buildBffHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  }),
  body: `url=${encodeURIComponent(url)}`,
});

  if (!submissionResponse.ok) {
    throw new Error(`URLの解析リクエストに失敗しました: ${await extractError(submissionResponse)}`);
  }

  const submissionJson = (await submissionResponse.json()) as BffSubmissionResponse;
  const analysisId = submissionJson.data?.id;

  if (!analysisId) {
    throw new Error('解析IDを取得できませんでした。');
  }

  // 2. 解析結果取得（ポーリング）
  const fetchAnalysis = async (): Promise<BffAnalysisResponse> => {
  const response = await fetch(`${baseUrl}/analyses/${analysisId}`, {
    method: 'GET',
    headers: buildBffHeaders(),
  });

    if (!response.ok) {
      throw new Error(`解析結果の取得に失敗しました: ${await extractError(response)}`);
    }

    return (await response.json()) as BffAnalysisResponse;
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

  // 3. VirusTotal解析完了後に内部リスト照会を実行
  const internalListResult = await checkInternalList(url, baseUrl, buildBffHeaders());
  
  // 最終結果に内部リストの結果を含めて再構築
  return normalizeResult(analysisJson, url, internalListResult);
}