import type { InternalListResult } from './types';

interface PaymentService {
  serviceName: string;
  category: string;
  domains: string[];
  notice: string;
}

interface LocalInternalListConfig {
  paymentServices: PaymentService[];
}

let cachedConfig: LocalInternalListConfig | null = null;

// ローカル内部リスト設定を読み込む
const loadLocalInternalList = (): LocalInternalListConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // React Nativeの場合、require で静的にインポート
    cachedConfig = require('@/config/local-internal-list.json') as LocalInternalListConfig;
    return cachedConfig;
  } catch (error) {
    console.warn('ローカル内部リストの読み込みに失敗しました:', error);
    return { paymentServices: [] };
  }
};

// URLからドメインを抽出
const extractDomain = (url: string): string | null => {
  try {
    // プロトコルがない場合は追加
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.toLowerCase();
  } catch {
    return null;
  }
};

// ドメインが登録されているサービスを検索
const findServiceByDomain = (domain: string, config: LocalInternalListConfig): PaymentService | null => {
  for (const service of config.paymentServices) {
    for (const registeredDomain of service.domains) {
      const normalizedRegistered = registeredDomain.toLowerCase();

      // 完全一致
      if (domain === normalizedRegistered) {
        return service;
      }

      // サブドメイン対応（例: xxx.paypay.ne.jp が paypay.ne.jp にマッチ）
      if (domain.endsWith(`.${normalizedRegistered}`)) {
        return service;
      }
    }
  }
  return null;
};

// ローカル内部リスト照会
export const checkLocalInternalList = (url: string): InternalListResult | undefined => {
  const domain = extractDomain(url);
  if (!domain) {
    return undefined;
  }

  const config = loadLocalInternalList();
  const service = findServiceByDomain(domain, config);

  if (!service) {
    return {
      listed: false,
      serviceName: null,
      category: null,
      notice: null,
    };
  }

  return {
    listed: true,
    serviceName: service.serviceName,
    category: service.category,
    notice: service.notice,
  };
};
