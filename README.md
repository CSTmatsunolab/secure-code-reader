# Secure Code Reader

Secure Code Reader は、QR コードに埋め込まれたリンクや設定情報をすばやく分類し、安全性を判断するための Expo (React Native) アプリです。QR コードを読み取るだけで、URL／電話番号／Wi-Fi 情報などのペイロードを自動判定し、VirusTotal を使った詳細チェックや送金リンク向けの強警告をアプリ内で完結できます。

## 主な機能
- **QR セキュリティスキャン**: カメラで QR コードを読み取り、ペイロードをリアルタイムに解析。
- **画像からのスキャン**: スクリーンショットや保存済みの写真を選んで QR コードを解析。
- **ペイロード分類**: URL・電話番号・Wi-Fi・その他テキストを自動分類し、原文とメタ情報を併記。
- **安全性チェック**: VirusTotal API v3 と連携し、解析完了まで自動でポーリングして verdict を取得。
- **決済QR判定**: ローカル内部リストで決済サービス（PayPay、楽天ペイなど）を自動判定し、安全性を表示。
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
3. **API 設定（3つの方式から選択）**

   ### 方式1: VirusTotal APIを直接使用（推奨）
   `config/local-api-keys.json` を開き、VirusTotal API キーを設定：
   ```json
   {
     "virusTotal": {
       "apiKey": "YOUR_VIRUSTOTAL_API_KEY"
     }
   }
   ```
   - URL解析に VirusTotal API を使用
   - 決済QR判定にローカル内部リスト（`config/local-internal-list.json`）を使用

   ### 方式2: BFF経由で使用（リリース向け実装）
   > **注意:** この方式は将来的な正式リリースを見据えた実装です。現在の開発・検証段階では基本的に方式1または方式3を推奨します。BFFが必要な場合は開発チームにご相談ください。

   `config/local-api-keys.json` を開き、BFF設定を追加：
   ```json
   {
     "virusTotal": {
       "apiKey": ""
     },
     "bff": {
       "baseUrl": "https://your-bff-endpoint.example.com",
       "apiKey": "YOUR_BFF_API_KEY"
     }
   }
   ```
   - URL解析を BFF 経由で実行
   - 決済QR判定を BFF の内部リスト（DynamoDB）で実行

   ### 方式3: 設定なし（内部リストのみ）
   設定ファイルをそのまま使用：
   ```json
   {
     "virusTotal": {
       "apiKey": ""
     }
   }
   ```
   - URL解析は実行不可
   - 決済QR判定のみローカル内部リストで利用可能

4. **（オプション）決済サービスリストのカスタマイズ**
   `config/local-internal-list.json` で決済サービスのドメインを追加・削除できます：
   ```json
   {
     "paymentServices": [
       {
         "serviceName": "PayPay",
         "category": "決済サービス",
         "domains": ["paypay.ne.jp", "pay-web.paypay.ne.jp"],
         "notice": "PayPay公式の決済QRコードです。安全に利用できます。"
       }
     ]
   }
   ```

5. **開発サーバーを起動**
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
    ├─ bff-strategy.ts          … BFF 経由での解析
    ├─ virus-total-strategy.ts  … VirusTotal 直接解析
    ├─ internal-list-strategy.ts… 内部リスト照会（BFF/ローカル）
    └─ local-internal-list.ts   … ローカル内部リスト照会

config/
  local-api-keys.json      … ローカル用 API キー (Git 管理外想定)
  local-internal-list.json … 決済サービスドメインリスト
```

## 今後のロードマップ
- 短縮 URL 展開やリダイレクト解析を担う BFF の拡張
- スキャン履歴と設定の永続化 (SecureStore など)
- Webプレビューやスクリーンショット取得
- iOS/Androidでのリリース準備

## 注意事項
- 本アプリはリスク判定を支援するツールです。最終的な安全性判断はユーザーの責任で行ってください。

---
質問や改善要望があれば Issue でお知らせください。
