# Secure Code Reader

Secure Code Reader は、QR コードに埋め込まれたリンクや設定情報をすばやく分類し、安全性を判断するための Expo (React Native) アプリです。QR コードを読み取るだけで、URL／電話番号／Wi-Fi 情報などのペイロードを自動判定し、VirusTotal を使った詳細チェックや送金リンク向けの強警告をアプリ内で完結できます。

## 主な機能
- **QR セキュリティスキャン**: カメラで QR コードを読み取り、ペイロードをリアルタイムに解析。
- **画像からのスキャン**: スクリーンショットや保存済みの写真を選んで QR コードを解析。
- **ペイロード分類**: URL・電話番号・Wi-Fi・その他テキストを自動分類し、原文とメタ情報を併記。
- **安全性チェック**: VirusTotal API v3 と連携し、解析完了まで自動でポーリングして verdict を取得。
- **強警告トグル**: 送金リンクやディープリンクを開く前に確認ダイアログを必ず表示。VirusTotal が `注意` / `危険` を返した履歴リンクも強制的に確認を挟みます。
- **履歴タブ**: 直近 50 件のスキャン結果を一意に保持。検索・昇降順切替・再判定・種類別アクション（URL を開く／電話発信／Wi-Fi 設定を開く）が利用可能。
- **設定タブ**: VirusTotal 利用可否や強警告のオン／オフ、プライバシーポリシー URL を管理。

## 技術スタック
- Expo Router + React Native (TypeScript, strict mode)
- Expo Camera / Linking / Safe Area Context など Expo SDK
- ESLint 9 (`eslint-config-expo`)

## クイックスタート
1. **環境を準備**
   - Node.js 18 以上 / npm 10 以上
   - Expo CLI (`npm install -g expo-cli`) ※任意
2. **依存関係をインストール**
   ```bash
   npm install
   ```
3. **VirusTotal API キーを設定**
   `config/local-api-keys.json` を開き、実際の API キーに置き換えます。
   ```json
   {
     "virusTotal": {
       "apiKey": "YOUR_VIRUSTOTAL_API_KEY"
     }
   }
   ```
   - `bff.baseUrl` は空のままにすると、アプリが直接 VirusTotal API v3 を呼び出します。
   - BFF を利用する場合は、`baseUrl` と `apiKey` を適切に設定してください。
4. **開発サーバーを起動**
   ```bash
   npm run start
   ```
   Expo CLI の案内に従い、iOS/Android エミュレーターや Expo Go アプリで動作を確認してください。

### よく使う npm スクリプト
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint`

## 使い方
詳しい使い方は[howto.md](document/howto.md)を参照してください。

## フォルダ構成 (抜粋)
```
app/
  └─ (tabs)/
       index.tsx      … QR スキャン画面
       history.tsx    … 履歴タブ
       settings.tsx   … 設定タブ

features/
  qr-capture/        … Expo Camera のラッパーとスキャンロジック
  payload-summary/   … 解析結果の表示コンポーネント
  url-scan/          … VirusTotal 判定 UI とフック
  scan-history/      … 履歴コンテキストとフック
  settings/          … アプリ設定コンテキスト

services/
  payload-classifier/… QR ペイロード分類ロジック
  url-analysis/      … VirusTotal 連携など URL 解析処理

config/local-api-keys.json … ローカル用 API キー (Git 管理外想定)
```

## 今後のロードマップ
- 短縮 URL 展開やリダイレクト解析を担う BFF の実装
- スキャン履歴と設定の永続化 (SecureStore など)

## 注意事項
- 本アプリはリスク判定を支援するツールです。最終的な安全性判断はユーザーの責任で行ってください。

---
質問や改善要望があれば Issue でお知らせください。
