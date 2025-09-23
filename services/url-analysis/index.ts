import { getBffBaseUrl } from '@/services/config/api-key-provider';

import { analyzeViaBff } from './bff-strategy';
import { analyzeViaVirusTotal } from './virus-total-strategy';
import type { UrlAnalysisResult } from './types';

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

export type { AnalysisStatus, ScanStats, UrlAnalysisResult, UrlVerdict } from './types';
