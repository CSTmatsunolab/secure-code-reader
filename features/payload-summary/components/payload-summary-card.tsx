import { memo, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Palette } from '@/constants/theme';

import { ClassifiedPayload } from '@/services/payload-classifier/types';

interface Props {
  payload: ClassifiedPayload;
  onScanAgain: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  isLoadingPrimaryAction?: boolean;
  onAnalyzeUrl?: () => void;
  isAnalyzing?: boolean;
  analysisResultCard?: ReactNode;
}

const kindLabel: Record<ClassifiedPayload['classification']['kind'], string> = {
  wifi: 'Wi-Fi',
  phone: '電話番号',
  url: 'URL',
  text: 'テキスト',
};

export const PayloadSummaryCard = memo(function PayloadSummaryCard({
  payload,
  onScanAgain,
  onPrimaryAction,
  primaryActionLabel,
  isLoadingPrimaryAction = false,
  onAnalyzeUrl,
  isAnalyzing = false,
  analysisResultCard,
}: Props) {
  const { classification, summary } = payload;

  const highlights = summary.highlights ?? [];
  const isUrl = classification.kind === 'url';

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.label}>
        {kindLabel[classification.kind]}
      </ThemedText>
      <ThemedText type="title" style={styles.title}>
        {summary.title}
      </ThemedText>
      {summary.subtitle ? (
        <ThemedText style={styles.subtitle}>{summary.subtitle}</ThemedText>
      ) : null}
      {highlights.length > 0 ? (
        <View style={styles.highlightList}>
          {highlights.map((item) => (
            <View key={`${item.label}-${item.value}`} style={styles.highlightItem}>
              <ThemedText type="defaultSemiBold" style={styles.highlightLabel}>
                {item.label}
              </ThemedText>
              <ThemedText style={styles.highlightValue}>{item.value}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.rawContainer}>
        <View style={styles.rawHeader}>
          <ThemedText type="defaultSemiBold" style={styles.rawLabel}>
            生データ
          </ThemedText>
          <InfoTooltip
            title="生データとは"
            description="QR コード内の文字列をそのまま表示しています。コピーしたい場合や、リンク先を開く前に確認したい場合に参照してください。"
            placement="top"
          />
        </View>
        <ThemedText style={styles.rawValue}>{classification.rawValue}</ThemedText>
      </View>
      <View style={styles.actions}>
        {isUrl && onAnalyzeUrl ? (
          <Pressable
            accessibilityRole="button"
            disabled={isAnalyzing}
            style={({ pressed }) => [
              styles.primaryButton,
              isAnalyzing && styles.primaryButtonLoading,
              pressed && !isAnalyzing ? styles.primaryButtonPressed : null,
            ]}
            onPress={onAnalyzeUrl}>
            {isAnalyzing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.primaryLabel}>
                安全性を判定する
              </ThemedText>
            )}
          </Pressable>
        ) : null}
        {!analysisResultCard && primaryActionLabel && onPrimaryAction ? (
          <Pressable
            accessibilityRole="button"
            disabled={isLoadingPrimaryAction}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && !isLoadingPrimaryAction ? styles.ghostButtonPressed : null,
            ]}
            onPress={onPrimaryAction}>
            {isLoadingPrimaryAction ? (
              <ActivityIndicator color={Palette.primary} />
            ) : (
              <ThemedText style={styles.ghostLabel}>
                {primaryActionLabel}
              </ThemedText>
            )}
          </Pressable>
        ) : null}
      </View>
      {analysisResultCard}
      {analysisResultCard && primaryActionLabel && onPrimaryAction ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isLoadingPrimaryAction}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && !isLoadingPrimaryAction ? styles.ghostButtonPressed : null,
            ]}
            onPress={onPrimaryAction}>
            {isLoadingPrimaryAction ? (
              <ActivityIndicator color={Palette.primary} />
            ) : (
              <ThemedText style={styles.ghostLabel}>
                {primaryActionLabel}
              </ThemedText>
            )}
          </Pressable>
        </View>
      ) : null}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 22,
    gap: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Palette.textSubtle,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Palette.textMuted,
  },
  highlightList: {
    gap: 16,
  },
  highlightItem: {
    gap: 4,
  },
  highlightLabel: {
    fontSize: 12,
    color: Palette.textSubtle,
  },
  highlightValue: {
    fontSize: 16,
  },
  rawContainer: {
    gap: 6,
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
  },
  rawHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rawLabel: {
    fontSize: 12,
    color: Palette.textSubtle,
  },
  rawValue: {
    fontFamily: 'ui-monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
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
  primaryButtonLoading: {
    opacity: 0.7,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
  },
  ghostButtonPressed: {
    opacity: 0.85,
  },
  ghostLabel: {
    fontSize: 14,
    color: Palette.primary,
  },
});
