import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RiskConfirmDialog } from '@/components/dialogs/risk-confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Palette } from '@/constants/theme';
import type { ScanHistoryEntry } from '@/features/scan-history/history-context';
import { useScanHistory } from '@/features/scan-history/hooks/use-scan-history';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { ScanResultCard } from '@/features/url-scan/components/scan-result-card';
import { isVirusTotalConfigured } from '@/services/config/api-key-provider';
import type { ClassifiedPayload } from '@/services/payload-classifier/types';
import { analyzeUrl } from '@/services/url-analysis';

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

function useHistoryHeading(count: number) {
  return useMemo(() => (count > 0 ? `スキャン履歴` : 'スキャン履歴'), [count]);
}

const kindLabel: Record<ClassifiedPayload['classification']['kind'], string> = {
  url: 'URL',
  phone: '電話番号',
  wifi: 'Wi-Fi',
  text: 'テキスト',
};

const verdictLabel: Record<string, string> = {
  danger: '⛔ 危険',
  warning: '⚠️ 注意',
  safe: '✓ 安全',
  unknown: '❓ 不明',
  unanalyzed: '未判定',
};

const verdictBadgeColors: Record<string, { backgroundColor: string; borderColor: string; textColor: string }> = {
  danger: {
    backgroundColor: 'rgba(217, 48, 37, 0.12)',
    borderColor: 'rgba(217, 48, 37, 0.32)',
    textColor: Palette.danger,
  },
  warning: {
    backgroundColor: 'rgba(249, 171, 0, 0.12)',
    borderColor: 'rgba(249, 171, 0, 0.28)',
    textColor: Palette.warning,
  },
  safe: {
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
    borderColor: 'rgba(21, 128, 61, 0.28)',
    textColor: Palette.success,
  },
  unknown: {
    backgroundColor: 'rgba(91, 103, 131, 0.12)',
    borderColor: 'rgba(91, 103, 131, 0.24)',
    textColor: Palette.textMuted,
  },
  unanalyzed: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    textColor: Palette.textSubtle,
  },
};


export default function HistoryScreen() {
  const { entries, clearHistory, updateEntryAnalysis } = useScanHistory();
  const { alwaysShowStrongWarning, useVirusTotal } = useSettings();
  const heading = useHistoryHeading(entries.length);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [riskDialog, setRiskDialog] = useState({
    visible: false,
    tone: 'info' as 'danger' | 'warning' | 'info',
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined,
  });

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      sortOrder === 'desc' ? b.scannedAt - a.scannedAt : a.scannedAt - b.scannedAt,
    );

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter(({ payload }) => {
      const { classification, summary } = payload;
      const haystack = [classification.rawValue, summary.title, summary.subtitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [entries, sortOrder, normalizedQuery]);

  const handleToggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  const hideRiskDialog = useCallback(() => {
    setRiskDialog((prev) => ({ ...prev, visible: false, onConfirm: undefined }));
  }, []);

  const handleRiskConfirm = useCallback(() => {
    const action = riskDialog.onConfirm;
    hideRiskDialog();
    action?.();
  }, [riskDialog, hideRiskDialog]);

  const handleOpenUrl = useCallback(
    async (entry: ScanHistoryEntry) => {
      const classification = entry.payload.classification;
      if (classification.kind !== 'url') {
        return;
      }

      const verdict = entry.analysis?.verdict;
      const hasAnalysis = !!verdict;

      const proceed = () => {
        Linking.openURL(classification.normalizedUrl).catch((err) =>
          console.warn('Failed to open URL from history', err),
        );
      };

      // 内部リスト照会
      const { checkInternalListOnly } = await import('@/services/url-analysis');
      const internalListResult = await checkInternalListOnly(classification.normalizedUrl);

      // VirusTotal設定がオフの場合の確認
      if (!useVirusTotal) {
        setRiskDialog({
          visible: true,
          tone: 'info',
          title: 'VirusTotal判定を推奨',
          message: 'より安全にリンクを開くには、設定タブで「VirusTotalを利用して詳細判定」をオンにして、安全性の判定を行うことを推奨します。\n\nそれでもリンクを開きますか？',
          onConfirm: proceed,
        });
        return;
      }

      // 判定が行われていない場合でも内部リストの結果を考慮
      const requiresPrompt =
        alwaysShowStrongWarning ||
        verdict === 'danger' ||
        verdict === 'warning' ||
        internalListResult?.listed;

      // VirusTotal判定がない場合でも内部リストに該当する場合は警告を出す
      if (!hasAnalysis && !internalListResult?.listed) {
        // 内部リストにも該当しない場合は判定を推奨
        setRiskDialog({
          visible: true,
          tone: 'warning',
          title: '安全性の判定を推奨',
          message: 'まだ安全性の判定が行われていません。先に「安全性を判定する」ボタンを押して判定を行うことを推奨します。\n\nそれでもリンクを開きますか？',
          onConfirm: proceed,
        });
        return;
      }

      if (requiresPrompt) {
        let message =
          '送金リンクやディープリンクの可能性があります。続行する前に内容を必ず確認してください。';
        let tone: 'danger' | 'warning' | 'info' = 'warning';

        if (verdict === 'danger') {
          message = 'VirusTotal で危険と判定されたリンクです。内容を十分に確認した上で続行してください。';
          tone = 'danger';
        } else if (verdict === 'warning') {
          message = 'VirusTotal で注意が必要と判定されています。送信元を再確認し十分に注意してください。';
          tone = 'warning';
        } else if (internalListResult?.listed) {
          const serviceName = internalListResult.serviceName || 'このサービス';
          const notice = internalListResult.notice || '内容を十分に確認してください。';
          message = `${serviceName}のリンクが検出されました。${notice}\n\n続行する前に、送金や個人情報の入力が必要でないか確認してください。`;
          tone = 'warning';
        }

        setRiskDialog({
          visible: true,
          tone,
          title: internalListResult?.listed ? '登録済みサービスの確認' : '安全性の確認',
          message,
          onConfirm: proceed,
        });
        return;
      }

      proceed();
    },
    [alwaysShowStrongWarning, useVirusTotal],
  );

  const handleCallPhone = useCallback((phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) =>
      console.warn('Failed to initiate call from history', err),
    );
  }, []);

  const handleOpenWifiSettings = useCallback(() => {
    Linking.openSettings()
      .then(() => {
        Alert.alert('設定アプリを開きました', 'SSID とパスワードを確認の上、接続してください。');
      })
      .catch((err) => console.warn('Failed to open settings from history', err));
  }, []);

  const handleAnalyzeUrl = useCallback(
    async (entry: ScanHistoryEntry) => {
      const classification = entry.payload.classification;
      if (classification.kind !== 'url') {
        return;
      }
      if (!useVirusTotal) {
        Alert.alert('VirusTotal が無効です', '設定タブで有効にしてから判定してください。');
        return;
      }
      if (!isVirusTotalConfigured()) {
        Alert.alert('APIキー未設定', 'config/local-api-keys.json に VirusTotal API キーを設定してください。');
        return;
      }
      setAnalyzingId(entry.id);
      try {
        const analysis = await analyzeUrl(classification.normalizedUrl);
        updateEntryAnalysis({ entryId: entry.id, analysis });
        setExpandedAnalysisId(entry.id);
      } catch (err) {
        Alert.alert(
          '解析に失敗しました',
          err instanceof Error ? err.message : '不明なエラーが発生しました。',
        );
      } finally {
        setAnalyzingId(null);
      }
    },
    [updateEntryAnalysis, useVirusTotal],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText type="title">{heading}</ThemedText>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.sortButton,
                pressed ? styles.sortButtonPressed : null,
                entries.length === 0 ? styles.disabledButton : null,
              ]}
              onPress={entries.length === 0 ? undefined : handleToggleSort}
              disabled={entries.length === 0}>
              <ThemedText style={styles.sortLabel}>
                {sortOrder === 'desc' ? '新しい順' : '古い順'}
              </ThemedText>
            </Pressable>
            {entries.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed ? styles.clearButtonPressed : null,
                ]}
                onPress={clearHistory}>
                <ThemedText style={styles.clearLabel}>履歴をクリア</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
        <TextInput
          placeholder="URL や SSID、電話番号で検索"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {filteredEntries.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText>表示できる履歴がありません。</ThemedText>
            <ThemedText style={styles.emptyHint}>QRコードを読み取るとここに表示されます。</ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.list}>
            {filteredEntries.map((entry) => {
              const { payload, scannedAt } = entry;
              const { classification, summary } = payload;
              const { kind } = classification;
              const isUrl = kind === 'url';
              const isPhone = kind === 'phone';
              const isWifi = kind === 'wifi';
              const showActions = isUrl || isPhone || isWifi;
              const verdict = entry.analysis?.verdict;
              const isDanger = verdict === 'danger';
              const isSubmittingAnalysis = analyzingId === entry.id;

              // 判定状態のバッジ表示用
              const verdictKey = isUrl ? (verdict || 'unanalyzed') : null;
              const verdictLabelText = verdictKey ? verdictLabel[verdictKey] : null;
              const badgePalette = verdictKey ? verdictBadgeColors[verdictKey] : null;

              return (
                <ThemedView
                  key={entry.id}
                  style={[styles.card, isDanger ? styles.cardDanger : null]}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="subtitle" style={styles.cardKind}>
                      {kindLabel[classification.kind]}
                    </ThemedText>
                    <ThemedText style={styles.cardTimestamp}>{formatTimestamp(scannedAt)}</ThemedText>
                  </View>
                  {verdictLabelText && badgePalette ? (
                    <View
                      style={[
                        styles.verdictBadge,
                        {
                          backgroundColor: badgePalette.backgroundColor,
                          borderColor: badgePalette.borderColor,
                        },
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[styles.verdictBadgeText, { color: badgePalette.textColor }]}>
                        {verdictLabelText}
                      </ThemedText>
                    </View>
                  ) : null}
                  <ThemedText type="title" style={styles.cardTitle}>
                    {summary.title}
                  </ThemedText>
                  {summary.subtitle ? (
                    <ThemedText style={styles.cardSubtitle}>{summary.subtitle}</ThemedText>
                  ) : null}
                  <View style={styles.cardBody}>
                    <View style={styles.cardRawHeader}>
                      <ThemedText style={styles.cardRawLabel}>生データ</ThemedText>
                      <InfoTooltip
                        title="生データとは"
                        description="QR コード内の文字列をそのまま表示しています。コピーしたい場合や、リンク先を開く前に確認したい場合に参照してください。"
                        placement="bottom"
                      />
                    </View>
                    <ThemedText style={styles.cardRawValue}>{classification.rawValue}</ThemedText>
                  </View>
                  {showActions ? (
                    <View style={styles.cardActions}>
                      {isUrl ? (
                        <>
                          <Pressable
                            style={({ pressed }) => [
                              styles.primaryActionButton,
                              pressed ? styles.primaryActionButtonPressed : null,
                              isSubmittingAnalysis ? styles.disabledButton : null,
                            ]}
                            disabled={isSubmittingAnalysis}
                            onPress={() => handleAnalyzeUrl(entry)}>
                            {isSubmittingAnalysis ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <ThemedText style={styles.primaryActionLabel}>
                                安全性を判定する
                              </ThemedText>
                            )}
                          </Pressable>
                          {!expandedAnalysisId || expandedAnalysisId !== entry.id ? (
                            <Pressable
                              style={({ pressed }) => [
                                styles.actionButton,
                                pressed ? styles.actionButtonPressed : null,
                              ]}
                              onPress={() => handleOpenUrl(entry)}>
                              <ThemedText style={styles.actionLabel}>リンクを開く</ThemedText>
                            </Pressable>
                          ) : null}
                        </>
                      ) : null}
                      {isPhone ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.actionButton,
                            pressed ? styles.actionButtonPressed : null,
                          ]}
                          onPress={() => handleCallPhone(classification.phoneNumber)}>
                          <ThemedText style={styles.actionLabel}>電話をかける</ThemedText>
                        </Pressable>
                      ) : null}
                      {isWifi ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.actionButton,
                            pressed ? styles.actionButtonPressed : null,
                          ]}
                          onPress={handleOpenWifiSettings}>
                          <ThemedText style={styles.actionLabel}>Wi-Fi設定を開く</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {expandedAnalysisId === entry.id && entry.analysis && isUrl ? (
                    <View style={styles.analysisResults}>
                      <View style={styles.analysisHeader}>
                        <ThemedText type="subtitle" style={styles.analysisTitle}>
                          解析結果
                        </ThemedText>
                        <Pressable onPress={() => setExpandedAnalysisId(null)}>
                          <ThemedText style={styles.collapseButton}>閉じる</ThemedText>
                        </Pressable>
                      </View>
                      <ScanResultCard
                        result={{
                          id: entry.id,
                          submittedUrl: classification.normalizedUrl,
                          status: entry.analysis.status,
                          verdict: entry.analysis.verdict,
                          provider: entry.analysis.provider,
                          stats: entry.analysis.stats || { harmless: 0, malicious: 0, suspicious: 0, undetected: 0, timeout: 0 },
                          detailsUrl: entry.analysis.detailsUrl,
                          engineFindings: entry.analysis.engineFindings,
                        }}
                      />
                    </View>
                  ) : null}
                  {isUrl && expandedAnalysisId === entry.id && entry.analysis ? (
                    <View style={styles.cardActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed ? styles.actionButtonPressed : null,
                        ]}
                        onPress={() => handleOpenUrl(entry)}>
                        <ThemedText style={styles.actionLabel}>リンクを開く</ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>
      <RiskConfirmDialog
        visible={riskDialog.visible}
        tone={riskDialog.tone}
        title={riskDialog.title}
        message={riskDialog.message}
        onConfirm={handleRiskConfirm}
        onCancel={hideRiskDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.surfaceMuted,
  },
  container: {
    flexGrow: 1,
    gap: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
  },
  clearButtonPressed: {
    opacity: 0.75,
  },
  clearLabel: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  sortButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
  },
  sortButtonPressed: {
    opacity: 0.75,
  },
  sortLabel: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  disabledButton: {
    opacity: 0.4,
  },
  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  emptyState: {
    gap: 8,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  emptyHint: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  list: {
    gap: 18,
  },
  card: {
    gap: 16,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardDanger: {
    borderColor: 'rgba(217, 48, 37, 0.45)',
    backgroundColor: 'rgba(217, 48, 37, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardKind: {
    fontSize: 14,
    letterSpacing: 0.6,
    color: Palette.textSubtle,
  },
  cardTimestamp: {
    fontSize: 13,
    color: Palette.textMuted,
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  verdictBadgeText: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textMuted,
  },
  cardBody: {
    gap: 8,
  },
  cardRawHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRawLabel: {
    fontSize: 12,
    color: Palette.textSubtle,
  },
  cardRawValue: {
    fontFamily: 'ui-monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Palette.primary,
    minWidth: 170,
    alignItems: 'center',
  },
  primaryActionButtonPressed: {
    opacity: 0.9,
  },
  primaryActionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.35)',
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionLabel: {
    fontSize: 14,
    color: Palette.primary,
  },
  analysisResults: {
    gap: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surfaceMuted,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapseButton: {
    fontSize: 14,
    color: Palette.primary,
  },
});
