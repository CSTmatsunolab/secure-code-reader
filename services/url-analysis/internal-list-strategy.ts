import { getBffApiKey, getBffBaseUrl } from '@/services/config/api-key-provider';
import type { InternalListResult } from './types';

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = getBffApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
};


// 内部リスト照会のみを実行（VirusTotal解析なし）
export const checkInternalListOnly = async (url: string): Promise<InternalListResult | undefined> => {
  const bffBaseUrl = getBffBaseUrl();
  if (!bffBaseUrl) {
    // BFFが設定されていない場合は内部リスト照会をスキップ
    return undefined;
  }

  try {
    const response = await fetch(`${bffBaseUrl}/resolve`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn(`内部リスト照会に失敗: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const result = await response.json() as InternalListResult;
    return result;
  } catch (error) {
    console.warn('内部リスト照会でエラー:', error);
    return undefined;
  }
};