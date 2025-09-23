import {
  ClassifiedPayload,
  ClassificationSummary,
  PhoneClassification,
  QrPayloadClassification,
  QrPayloadKind,
  TextClassification,
  UrlClassification,
  WifiClassification,
} from './types';

const WIFI_PREFIX = /^WIFI:/i;
const TEL_PREFIX = /^tel:/i;
const URL_PROTOCOL_REGEX = /^(https?:\/\/|ftp:\/\/)/i;
const PHONE_NUMBER_SANITIZE = /[^0-9+#*]/g;

const WIFI_KEYS = new Set(['S', 'T', 'P', 'H']);

const unescapeWifiValue = (value = ''): string =>
  value
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\\:/g, ':')
    .replace(/\\\\/g, '\\');

const mapWifiSecurity = (value?: string): WifiClassification['encryption'] => {
  const normalized = (value || '').toLowerCase();
  switch (normalized) {
    case 'wpa':
    case 'wpa2':
    case 'wpa3':
      return normalized as WifiClassification['encryption'];
    case 'wep':
      return 'wep';
    case 'nopass':
    case 'none':
      return 'nopass';
    default:
      return 'unknown';
  }
};

const buildSummary = (
  kind: QrPayloadKind,
  classification: QrPayloadClassification,
): ClassificationSummary => {
  switch (kind) {
    case 'wifi': {
      const wifi = classification as WifiClassification;
      const highlights = [
        { label: 'SSID', value: wifi.ssid || '未設定' },
        { label: '暗号化方式', value: wifi.encryption.toUpperCase() },
      ];
      if (wifi.password) {
        highlights.push({ label: 'パスワード', value: wifi.password });
      }
      if (wifi.hidden) {
        highlights.push({ label: '非公開ネットワーク', value: 'はい' });
      }
      return {
        title: 'Wi-Fi 設定情報',
        subtitle: 'スキャンした内容を端末の Wi-Fi 設定に転記する前に確認してください。',
        highlights,
      };
    }
    case 'phone': {
      const phone = classification as PhoneClassification;
      return {
        title: '電話番号リンク',
        subtitle: '発信前に相手先を確認してください。',
        highlights: [{ label: '番号', value: phone.phoneNumber }],
      };
    }
    case 'url': {
      const urlInfo = classification as UrlClassification;
      const url = new URL(urlInfo.normalizedUrl);
      const highlights = [
        { label: 'スキーム', value: url.protocol.replace(':', '') },
        { label: 'ドメイン', value: url.host },
      ];
      if (url.pathname && url.pathname !== '/') {
        highlights.push({ label: 'パス', value: url.pathname });
      }
      return {
        title: 'リンク URL',
        subtitle: '詳細分析を実行して安全性を確認しましょう。',
        highlights,
      };
    }
    default: {
      const text = classification as TextClassification;
      return {
        title: 'テキストデータ',
        subtitle: 'ペイロードを確認し、不審な内容がないか注意してください。',
        highlights: text.preview
          ? [{ label: '内容', value: text.preview }]
          : undefined,
      };
    }
  }
};

const classifyWifiPayload = (raw: string, body: string): WifiClassification | null => {
  const segments = body.split(';');
  const values: Record<string, string> = {};
  for (const segment of segments) {
    if (!segment) continue;
    const [key, ...rest] = segment.split(':');
    if (!key) continue;
    const upperKey = key.toUpperCase();
    if (!WIFI_KEYS.has(upperKey)) continue;
    values[upperKey] = unescapeWifiValue(rest.join(':'));
  }

  if (!values.S) {
    return null;
  }

  return {
    kind: 'wifi',
    rawValue: raw,
    ssid: values.S,
    encryption: mapWifiSecurity(values.T),
    password: values.P || undefined,
    hidden: values.H ? values.H.toLowerCase() === 'true' || values.H === '1' : undefined,
  };
};

const classifyPhonePayload = (raw: string): PhoneClassification | null => {
  const sanitized = raw.replace(TEL_PREFIX, '');
  const normalized = sanitized.replace(PHONE_NUMBER_SANITIZE, '');
  if (!normalized) {
    return null;
  }

  return {
    kind: 'phone',
    rawValue: raw,
    phoneNumber: normalized,
  };
};

const ensureUrlHasProtocol = (value: string): string => {
  if (URL_PROTOCOL_REGEX.test(value)) {
    return value;
  }
  return `https://${value}`;
};

const classifyUrlPayload = (raw: string): UrlClassification | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = ensureUrlHasProtocol(trimmed);
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:', 'ftp:'].includes(url.protocol)) {
      return null;
    }
    return {
      kind: 'url',
      rawValue: raw,
      url: trimmed,
      normalizedUrl: url.toString(),
    };
  } catch (error) {
    return null;
  }
};

const classifyTextPayload = (raw: string): TextClassification => {
  const preview = raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
  return {
    kind: 'text',
    rawValue: raw,
    preview,
  };
};

export const classifyQrPayload = (raw: string): ClassifiedPayload => {
  const trimmed = raw.trim();

  if (!trimmed) {
    const classification = classifyTextPayload(raw);
    return {
      classification,
      summary: buildSummary(classification.kind, classification),
    };
  }

  if (WIFI_PREFIX.test(trimmed)) {
    const body = trimmed.slice(5);
    const wifi = classifyWifiPayload(trimmed, body);
    if (wifi) {
      return {
        classification: wifi,
        summary: buildSummary('wifi', wifi),
      };
    }
  }

  if (TEL_PREFIX.test(trimmed)) {
    const phone = classifyPhonePayload(trimmed);
    if (phone) {
      return {
        classification: phone,
        summary: buildSummary('phone', phone),
      };
    }
  }

  const url = classifyUrlPayload(trimmed);
  if (url) {
    return {
      classification: url,
      summary: buildSummary('url', url),
    };
  }

  const text = classifyTextPayload(trimmed);
  return {
    classification: text,
    summary: buildSummary('text', text),
  };
};
