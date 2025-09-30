import config from '@/config/local-api-keys.json';

type VirusTotalConfig = {
  apiKey?: string;
};

type BffConfig = {
  baseUrl?: string;
  apiKey?: string;
};

type LocalApiConfig = {
  virusTotal?: VirusTotalConfig;
  bff?: BffConfig;
};

const localConfig: LocalApiConfig = config;

const sanitizeKey = (value?: string | null) => {
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
  const envBaseUrl = sanitizeKey(process.env.EXPO_PUBLIC_BFF_BASE_URL ?? null);
  if (envBaseUrl) {
    return envBaseUrl;
  }

  return sanitizeKey(localConfig.bff?.baseUrl);
};

export const getBffApiKey = (): string | undefined => {
  const envApiKey = sanitizeKey(process.env.EXPO_PUBLIC_BFF_API_KEY ?? null);
  if (envApiKey) {
    return envApiKey;
  }
  return sanitizeKey(localConfig.bff?.apiKey);
};