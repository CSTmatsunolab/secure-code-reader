import { getBffApiKey, getBffBaseUrl } from '@/services/config/api-key-provider';
import type { InternalListResult } from './types';
import { checkLocalInternalList } from './local-internal-list';

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

// BFF経由で内部リスト照会
const checkBffInternalList = async (url: string, bffBaseUrl: string): Promise<InternalListResult | undefined> => {
  try {
    const response = await fetch(`${bffBaseUrl}/resolve`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn(`BFF内部リスト照会に失敗: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const result = await response.json() as InternalListResult;
    return result;
  } catch (error) {
    console.warn('BFF内部リスト照会でエラー:', error);
    return undefined;
  }
};

// 内部リスト照会のみを実行（VirusTotal解析なし）
// BFFが設定されている場合はBFF、なければローカルリストを使用
export const checkInternalListOnly = async (url: string): Promise<InternalListResult | undefined> => {
  const bffBaseUrl = getBffBaseUrl();

  if (bffBaseUrl) {
    // BFFが設定されている場合はBFFを優先
    return await checkBffInternalList(url, bffBaseUrl);
  }

  // BFFがない場合はローカル内部リストを使用
  return checkLocalInternalList(url);
};