# Secure Code Reader

Secure Code Reader は、QR コードに埋め込まれたリンクや設定情報をすばやく分類し、安全性を判断するための Expo (React Native) アプリです。QR コードを読み取るだけで、URL／電話番号／Wi-Fi 情報などのペイロードを自動判定し、VirusTotal を使った詳細チェックや送金リンク向けの強警告をアプリ内で完結できます。

## 主な機能
- **QR セキュリティスキャン**: カメラで QR コードを読み取り、ペイロードをリアルタイムに解析。
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
     },
     "bff": {
       "baseUrl": ""
     }
   }
   ```
   - `bff.baseUrl` は空のままにすると、アプリが直接 VirusTotal API v3 を呼び出します。
   - 後日 BFF を導入する場合に備えた項目です。現状は空で問題ありません。
4. **開発サーバーを起動**
   ```bash
   npm run start
   ```
   Expo CLI の案内に従い、iOS/Android エミュレーターや Expo Go アプリで動作を確認してください。

### よく使う npm スクリプト
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint`

## 使い方
### スキャンタブ (Scan)
1. カメラへのアクセスを許可すると正方形のガイド枠が表示されます。
2. QR コードを枠に収めると読み取りが行われ、分類結果が表示されます。
3. URL の場合は「リンクを開く」ボタンと VirusTotal による安全性判定フォームが表示されます。
4. 判定中は自動的に VirusTotal の解析完了を待機し、結果が返るとカードに verdict が反映されます。
5. 設定タブで「強警告を常に表示」を有効にすると、リンクを開く前に必ず確認ダイアログが表示されます。

### 履歴タブ (History)
- 最新 50 件のスキャンを重複なく保持（同じ QR を再度読むと最新時刻に更新）。
- 検索バー／新しい順・古い順の切替で履歴を絞り込み。
- URL/電話/Wi-Fi には各種アクションボタンを表示。
  - **安全性を判定する**: VirusTotal で再解析し、verdict と詳細 URL を更新。
  - **リンクを開く**: `注意`/`危険` 判定や強警告オン時は必ず確認ダイアログを表示。
  - **電話をかける** / **Wi-Fi 設定を開く**: 端末のネイティブ機能を呼び出し。
- 「履歴をクリア」で一覧を初期化できます。

### 設定タブ (Settings)
- **VirusTotal を利用して詳細判定**: VirusTotal API を使用するかどうかを切り替えます。
- **強警告を常に表示**: 送金・ディープリンクを開く際に必ず確認ダイアログを出します。
- **プライバシーポリシー**: `app/(tabs)/settings.tsx` 内の URL を任意の公開ページに差し替えてください。

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
- VirusTotal API キーは配布用ビルドに含めないでください。公開時は必ず BFF などサーバー側で秘匿してください。
- 本アプリはリスク判定を支援するツールです。最終的な安全性判断はユーザーの責任で行ってください。

---
質問や改善要望があれば Issue でお知らせください。
