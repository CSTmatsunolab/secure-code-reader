import config from '@/config/local-api-keys.json';

type VirusTotalConfig = {
  apiKey?: string;
};

type BffConfig = {
  baseUrl?: string;
};

type LocalApiConfig = {
  virusTotal?: VirusTotalConfig;
  bff?: BffConfig;
};

const localConfig: LocalApiConfig = config;

const sanitizeKey = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase().startsWith('REPLACE_WITH')) {
    return undefined;
  }

  return trimmed;
};

export const getVirusTotalApiKey = (): string | undefined => sanitizeKey(localConfig.virusTotal?.apiKey);

export const isVirusTotalConfigured = (): boolean => {
  // VirusTotalのAPIキーが設定されているか、BFFのベースURLが設定されていればOK
  return Boolean(getVirusTotalApiKey()) || Boolean(getBffBaseUrl());
};

export const getBffBaseUrl = (): string | undefined => {
  const trimmed = localConfig.bff?.baseUrl?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
};
