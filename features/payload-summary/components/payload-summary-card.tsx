import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';

import { ClassifiedPayload } from '@/services/payload-classifier/types';
import type { UrlAnalysisResult, UrlVerdict } from '@/services/url-analysis';

interface Props {
  payload: ClassifiedPayload;
  onScanAgain: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  isLoadingPrimaryAction?: boolean;
  onAnalyzeUrl?: () => void;
  isAnalyzing?: boolean;
  analysisResult?: UrlAnalysisResult | null;
}

const kindLabel: Record<ClassifiedPayload['classification']['kind'], string> = {
  wifi: 'Wi-Fi',
  phone: '電話番号',
  url: 'URL',
  text: 'テキスト',
};

const verdictLabel: Record<UrlVerdict, string> = {
  danger: '危険',
  warning: '注意',
  safe: '安全',
  unknown: '判定保留',
};

const verdictBadgeColors: Record<UrlVerdict, { backgroundColor: string; borderColor: string; textColor: string }> = {
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
};

export const PayloadSummaryCard = memo(function PayloadSummaryCard({
  payload,
  onScanAgain,
  onPrimaryAction,
  primaryActionLabel,
  isLoadingPrimaryAction = false,
  onAnalyzeUrl,
  isAnalyzing = false,
  analysisResult,
}: Props) {
  const { classification, summary } = payload;

  const highlights = summary.highlights ?? [];
  const isUrl = classification.kind === 'url';
  const verdict = analysisResult?.verdict;
  const badgePalette = verdict ? verdictBadgeColors[verdict] : null;
  const verdictLabelDisplay = verdict ? verdictLabel[verdict] : null;
  const primaryFinding = analysisResult?.engineFindings?.[0];

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
        <ThemedText type="defaultSemiBold" style={styles.rawLabel}>
          生データ
        </ThemedText>
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
        {!analysisResult && primaryActionLabel && onPrimaryAction ? (
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
      {analysisResult ? (
        <View style={styles.analysisResults}>
          <ThemedText type="subtitle" style={styles.analysisTitle}>
            解析結果
          </ThemedText>
          {badgePalette && verdictLabelDisplay ? (
            <View
              style={[
                styles.verdictCard,
                {
                  backgroundColor: badgePalette.backgroundColor,
                  borderColor: badgePalette.borderColor,
                },
              ]}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.verdictText, { color: badgePalette.textColor }]}>
                {verdictLabelDisplay}
              </ThemedText>
            </View>
          ) : null}
          {analysisResult.stats ? (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{analysisResult.stats.malicious}</ThemedText>
                <ThemedText style={styles.statLabel}>危険</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{analysisResult.stats.suspicious}</ThemedText>
                <ThemedText style={styles.statLabel}>注意</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{analysisResult.stats.harmless}</ThemedText>
                <ThemedText style={styles.statLabel}>安全</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{analysisResult.stats.undetected}</ThemedText>
                <ThemedText style={styles.statLabel}>未検出</ThemedText>
              </View>
            </View>
          ) : null}
          {primaryFinding ? (
            <View style={styles.cardFinding}>
              <View
                style={[
                  styles.cardFindingBadge,
                  primaryFinding.tone === 'danger'
                    ? styles.cardFindingBadgeDanger
                    : styles.cardFindingBadgeWarning,
                ]}>
                <ThemedText type="defaultSemiBold" style={styles.cardFindingBadgeText}>
                  {primaryFinding.categoryLabel}
                </ThemedText>
              </View>
              <ThemedText style={styles.cardFindingEngine}>
                {primaryFinding.engine}
              </ThemedText>
              {primaryFinding.threat ? (
                <ThemedText style={styles.cardFindingThreat}>
                  {primaryFinding.threat}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {analysisResult && primaryActionLabel && onPrimaryAction ? (
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
  analysisResults: {
    gap: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surfaceMuted,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  verdictCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  statLabel: {
    fontSize: 12,
    color: Palette.textMuted,
  },
  cardFinding: {
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    padding: 12,
    backgroundColor: Palette.surface,
  },
  cardFindingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardFindingBadgeDanger: {
    backgroundColor: 'rgba(217, 48, 37, 0.16)',
  },
  cardFindingBadgeWarning: {
    backgroundColor: 'rgba(196, 127, 0, 0.16)',
  },
  cardFindingBadgeText: {
    fontSize: 12,
    color: '#11181C',
  },
  cardFindingEngine: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardFindingThreat: {
    fontSize: 14,
    color: Palette.textMuted,
  },
});
