import { getBffBaseUrl } from '@/services/config/api-key-provider';

import { analyzeViaBff } from './bff-strategy';
import type { UrlAnalysisResult } from './types';
import { analyzeViaVirusTotal } from './virus-total-strategy';

export const analyzeUrl = async (url: string): Promise<UrlAnalysisResult> => {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URLを入力してください。');
  }

  const bffBaseUrl = getBffBaseUrl();
  if (bffBaseUrl) {
    return analyzeViaBff(trimmed, bffBaseUrl);
  }

  return analyzeViaVirusTotal(trimmed);
};

export type { AnalysisStatus, InternalListResult, ScanStats, UrlAnalysisResult, UrlVerdict } from './types';

