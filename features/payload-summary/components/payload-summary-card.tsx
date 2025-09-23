import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';

import { ClassifiedPayload } from '@/services/payload-classifier/types';

interface Props {
  payload: ClassifiedPayload;
  onScanAgain: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
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
}: Props) {
  const { classification, summary } = payload;

  const highlights = summary.highlights ?? [];

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
        {primaryActionLabel && onPrimaryAction ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
            onPress={onPrimaryAction}>
            <ThemedText type="defaultSemiBold" style={styles.primaryLabel}>
              {primaryActionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.ghostButton,
            pressed ? styles.ghostButtonPressed : null,
          ]}
          onPress={onScanAgain}>
          <ThemedText style={styles.ghostLabel}>別のコードを読む</ThemedText>
        </Pressable>
      </View>
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
