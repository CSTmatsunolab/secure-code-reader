import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RiskConfirmDialog } from '@/components/dialogs/risk-confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { PayloadSummaryCard } from '@/features/payload-summary/components/payload-summary-card';
import { QrCameraView } from '@/features/qr-capture/components/qr-camera-view';
import { useQrScanner } from '@/features/qr-capture/hooks/use-qr-scanner';
import { useScanHistory } from '@/features/scan-history/hooks/use-scan-history';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { UrlScanForm } from '@/features/url-scan/components/url-scan-form';
import { classifyQrPayload } from '@/services/payload-classifier/parser';
import type { ClassifiedPayload } from '@/services/payload-classifier/types';
import type { UrlAnalysisResult } from '@/services/url-analysis';
import { checkInternalListOnly } from '@/services/url-analysis';

export default function ScanScreen() {
  const {
    permission,
    isCameraActive,
    isInitialising,
    isRequestingPermission,
    handleCodeScanned,
    requestPermission,
    reset,
    result,
    error,
  } = useQrScanner();

  const classifiedPayload = useMemo<ClassifiedPayload | undefined>(() => {
    if (!result?.data) {
      return undefined;
    }
    return classifyQrPayload(result.data);
  }, [result]);

  const { entries, addEntry, updateEntryAnalysis } = useScanHistory();
  const { useVirusTotal, alwaysShowStrongWarning } = useSettings();
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isCheckingInternalList, setIsCheckingInternalList] = useState(false);
  const [riskDialog, setRiskDialog] = useState({
    visible: false,
    tone: 'info' as 'danger' | 'warning' | 'info',
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined,
  });

  const lastLoggedId = useRef<string | null>(null);

  const currentEntryId = useMemo(() => {
    if (!classifiedPayload) {
      return null;
    }
    const { classification } = classifiedPayload;
    return `${classification.kind}:${classification.rawValue}`;
  }, [classifiedPayload]);

  const currentEntry = useMemo(() => {
    if (!currentEntryId) {
      return undefined;
    }
    return entries.find((entry) => entry.id === currentEntryId);
  }, [entries, currentEntryId]);

  const hideRiskDialog = useCallback(() => {
    setRiskDialog((prev) => ({ ...prev, visible: false, onConfirm: undefined }));
  }, []);

  const handleRiskConfirm = useCallback(() => {
    const action = riskDialog.onConfirm;
    hideRiskDialog();
    action?.();
  }, [riskDialog, hideRiskDialog]);

  useEffect(() => {
    if (result && classifiedPayload && currentEntryId) {
      if (lastLoggedId.current !== currentEntryId) {
        addEntry({ payload: classifiedPayload, scannedAt: result.scannedAt });
        lastLoggedId.current = currentEntryId;
      }
    }
  }, [result, classifiedPayload, addEntry, currentEntryId]);

  useEffect(() => {
    if (!result) {
      lastLoggedId.current = null;
      setIsDetailsVisible(false);
    }
  }, [result]);

  const handleShowDetails = useCallback(() => {
    setIsDetailsVisible(true);
  }, []);

  const handleRescan = useCallback(() => {
    setIsDetailsVisible(false);
    reset();
  }, [reset]);

  const primaryActionLabel = useMemo(() => {
    if (!classifiedPayload) {
      return undefined;
    }
    switch (classifiedPayload.classification.kind) {
      case 'url':
        return 'リンクを開く';
      case 'phone':
        return '電話をかける';
      case 'wifi':
        return 'Wi-Fi設定を開く';
      default:
        return undefined;
    }
  }, [classifiedPayload]);

  const handlePrimaryAction = useCallback(async () => {
    if (!classifiedPayload) {
      return;
    }

    try {
      const { classification } = classifiedPayload;
      switch (classification.kind) {
        case 'url':
          if (!classification.normalizedUrl) {
            return;
          }
          
          try {
            // 内部リスト照会開始
            setIsCheckingInternalList(true);
            const internalListResult = await checkInternalListOnly(classification.normalizedUrl);
            
            const verdict = currentEntry?.analysis?.verdict;
            const requiresPrompt =
              alwaysShowStrongWarning || 
              verdict === 'danger' || 
              verdict === 'warning' ||
              internalListResult?.listed; // 内部リストにある場合も確認を促す

            const proceed = () => {
              Linking.openURL(classification.normalizedUrl).catch((err) => {
                Alert.alert(
                  'リンクを開けません',
                  err instanceof Error ? err.message : '不明なエラーが発生しました。',
                );
              });
            };

            if (requiresPrompt) {
              let message =
                '送金リンクやディープリンクの可能性があります。続行する前に内容を必ず確認してください。';
              let tone: 'danger' | 'warning' | 'info' = 'warning';

              if (verdict === 'danger') {
                message = 'VirusTotal で危険と判定されたリンクです。内容を十分に確認した上で続行してください。';
                tone = 'danger';
              } else if (verdict === 'warning') {
                message = 'VirusTotal で注意が必要と判定されています。送信元を再確認し十分に注意してください。';
              } else if (internalListResult?.listed) {
                // 内部リストに登録されている場合の警告メッセージ
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

            await Linking.openURL(classification.normalizedUrl);
          } finally {
            // 内部リスト照会完了
            setIsCheckingInternalList(false);
          }
          break;
        case 'phone':
          await Linking.openURL(`tel:${classification.phoneNumber}`);
          break;
        case 'wifi':
          await Linking.openSettings();
          Alert.alert(
            'Wi-Fi設定を開きました',
            'SSID とパスワードを確認し、端末の設定から接続してください。',
          );
          break;
        default:
          break;
      }
    } catch (err) {
      Alert.alert(
        'アクションを実行できません',
        err instanceof Error ? err.message : '不明なエラーが発生しました。',
      );
    }
  }, [classifiedPayload, alwaysShowStrongWarning, currentEntry]);

  const handleAnalysisResult = useCallback(
    (analysis: UrlAnalysisResult) => {
      if (!currentEntryId) {
        return;
      }
      updateEntryAnalysis({ entryId: currentEntryId, analysis });
    },
    [currentEntryId, updateEntryAnalysis],
  );

  const manualFormTitle =
    classifiedPayload?.classification.kind === 'url'
      ? 'URLの安全性チェック (読み取り結果)'
      : 'URLを手入力して判定';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.heroCard}>
          <ThemedText type="title" style={styles.heroTitle}>
            QR セキュリティスキャン
          </ThemedText>
        </ThemedView>
        <View style={styles.cameraContainer}>
          <QrCameraView
            permission={permission}
            isInitialising={isInitialising}
            isRequestingPermission={isRequestingPermission}
            isCameraActive={isCameraActive}
            onRequestPermission={requestPermission}
            onCodeScanned={handleCodeScanned}
          />
        </View>
        {error ? (
          <ThemedText type="defaultSemiBold" style={styles.errorText}>
            {error}
          </ThemedText>
        ) : null}
        {result && !isDetailsVisible ? (
          <ThemedView style={styles.resultPrompt}>
            <ThemedText type="subtitle">QRコードを読み取りました</ThemedText>
            <ThemedText>「スキャンする」を押して詳細を確認してください。</ThemedText>
            <View style={styles.promptActions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : null,
                ]}
                onPress={handleShowDetails}>
                <ThemedText type="defaultSemiBold" style={styles.primaryLabel}>
                  スキャンする
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.secondaryButtonPressed : null,
                ]}
                onPress={handleRescan}>
                <ThemedText style={styles.secondaryLabel}>別のコードを読む</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : null}
        {!result ? (
          <ThemedView style={styles.emptyStateCard}>
            <ThemedText type="subtitle" style={styles.emptyStateTitle}>
              まだ読み取ったコードはありません
            </ThemedText>
            <ThemedText style={styles.emptyStateBody}>
              ガイド枠に QR コードを収めると自動で解析が始まり、結果がここに表示されます。
            </ThemedText>
          </ThemedView>
        ) : null}
        {isDetailsVisible && classifiedPayload ? (
          <PayloadSummaryCard
            payload={classifiedPayload}
            onScanAgain={handleRescan}
            onPrimaryAction={primaryActionLabel ? handlePrimaryAction : undefined}
            primaryActionLabel={primaryActionLabel}
            isLoadingPrimaryAction={isCheckingInternalList}
          />
        ) : null}
        {isDetailsVisible && classifiedPayload?.classification.kind === 'url' ? (
          useVirusTotal ? (
            <UrlScanForm
              initialUrl={classifiedPayload.classification.normalizedUrl}
              title={manualFormTitle}
              onResult={handleAnalysisResult}
            />
          ) : (
            <ThemedText style={styles.virusTotalOffNotice}>
              設定で「VirusTotalを利用して詳細判定」を有効にすると、安全性の詳細チェックが利用できます。
            </ThemedText>
          )
        ) : null}
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
  scroll: {
    backgroundColor: Palette.surfaceMuted,
  },
  container: {
    flexGrow: 1,
    gap: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroCard: {
    gap: 18,
    padding: 24,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroHeading: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Palette.textMuted,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Palette.surfaceMuted,
  },
  heroChipBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.primary,
  },
  heroChipBadgeSecondary: {
    backgroundColor: Palette.primaryDark,
  },
  heroChipBadgeTertiary: {
    backgroundColor: Palette.warning,
  },
  heroChipText: {
    fontSize: 13,
    color: Palette.textMuted,
  },
  cameraContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  emptyStateCard: {
    gap: 8,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textMuted,
  },
  errorText: {
    color: Palette.danger,
    fontSize: 14,
  },
  resultPrompt: {
    gap: 12,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  promptActions: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryLabel: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  virusTotalOffNotice: {
    fontSize: 14,
    color: Palette.textMuted,
    lineHeight: 20,
    backgroundColor: Palette.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
  },
});
