export type QrPayloadKind = 'url' | 'wifi' | 'phone' | 'text';

export interface BaseClassification {
  kind: QrPayloadKind;
  rawValue: string;
}

export interface UrlClassification extends BaseClassification {
  kind: 'url';
  url: string;
  normalizedUrl: string;
}

export interface WifiClassification extends BaseClassification {
  kind: 'wifi';
  ssid: string;
  hidden?: boolean;
  encryption: 'nopass' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'unknown';
  password?: string;
}

export interface PhoneClassification extends BaseClassification {
  kind: 'phone';
  phoneNumber: string;
}

export interface TextClassification extends BaseClassification {
  kind: 'text';
  preview: string;
}

export type QrPayloadClassification =
  | UrlClassification
  | WifiClassification
  | PhoneClassification
  | TextClassification;

export interface ClassificationSummary {
  title: string;
  subtitle?: string;
  highlights?: Array<{ label: string; value: string }>;
}

export interface ClassifiedPayload {
  classification: QrPayloadClassification;
  summary: ClassificationSummary;
}
