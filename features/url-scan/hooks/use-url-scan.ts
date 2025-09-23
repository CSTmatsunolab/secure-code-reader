import { useCallback, useState } from 'react';

import { analyzeUrl } from '@/services/url-analysis';
import type { UrlAnalysisResult } from '@/services/url-analysis';

export type ScanFlowState = 'idle' | 'submitting' | 'resolved' | 'error';

interface UseUrlScanResult {
  url: string;
  setUrl: (value: string) => void;
  status: ScanFlowState;
  result: UrlAnalysisResult | null;
  error?: string;
  submit: () => Promise<void>;
}

export const useUrlScan = (initialUrl = ''): UseUrlScanResult => {
  const [url, setUrlState] = useState(initialUrl);
  const [status, setStatus] = useState<ScanFlowState>('idle');
  const [result, setResult] = useState<UrlAnalysisResult | null>(null);
  const [error, setError] = useState<string>();

  const setUrl = useCallback(
    (value: string) => {
      setUrlState(value);
      if (status === 'error') {
        setError(undefined);
        setStatus(result ? 'resolved' : 'idle');
      }
    },
    [status, result],
  );

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('URLを入力してください。');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(undefined);

    try {
      const analysis = await analyzeUrl(trimmed);
      setResult(analysis);
      setStatus('resolved');
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('不明なエラーが発生しました。');
      }
    }
  }, [url]);

  return {
    url,
    setUrl,
    status,
    result,
    error,
    submit,
  };
};
