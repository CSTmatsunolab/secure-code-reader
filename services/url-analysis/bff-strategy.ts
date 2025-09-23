import type { UrlAnalysisResult } from './types';

export async function analyzeViaBff(url: string, baseUrl: string): Promise<UrlAnalysisResult> {
  throw new Error(
    'BFF連携は未実装です。baseUrl を設定する前に BFF 側の実装を追加してください。',
  );
}
