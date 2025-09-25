import { memo, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';

type Tone = 'danger' | 'warning' | 'info';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const toneStyles: Record<Tone, { borderColor: string; badgeColor: string; badgeText: string; shadow: string }> = {
  danger: {
    borderColor: 'rgba(217, 48, 37, 0.45)',
    badgeColor: 'rgba(217, 48, 37, 0.16)',
    badgeText: Palette.danger,
    shadow: 'rgba(217, 48, 37, 0.35)',
  },
  warning: {
    borderColor: 'rgba(196, 127, 0, 0.45)',
    badgeColor: 'rgba(196, 127, 0, 0.16)',
    badgeText: Palette.warning,
    shadow: 'rgba(196, 127, 0, 0.35)',
  },
  info: {
    borderColor: Palette.cardBorder,
    badgeColor: 'rgba(37, 99, 235, 0.16)',
    badgeText: Palette.primary,
    shadow: 'rgba(15, 23, 42, 0.25)',
  },
};

export const RiskConfirmDialog = memo(function RiskConfirmDialog({
  visible,
  title,
  message,
  tone = 'info',
  confirmLabel = '続行',
  cancelLabel = 'キャンセル',
  onCancel,
  onConfirm,
}: Props) {
  const palette = useMemo(() => toneStyles[tone], [tone]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <ThemedView
          style={[
            styles.dialog,
            { borderColor: palette.borderColor, shadowColor: palette.shadow },
          ]}>
          <View style={[styles.badge, { backgroundColor: palette.badgeColor }]}
>
            <ThemedText type="subtitle" style={[styles.badgeText, { color: palette.badgeText }]}>
              警告
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
              onPress={onCancel}>
              <ThemedText style={styles.secondaryLabel}>{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
                tone === 'danger' ? styles.primaryButtonDanger : null,
                tone === 'warning' ? styles.primaryButtonWarning : null,
              ]}
              onPress={onConfirm}>
              <ThemedText style={styles.primaryLabel}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    gap: 18,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    backgroundColor: Palette.surface,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: Palette.textMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryLabel: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Palette.primary,
  },
  primaryButtonWarning: {
    backgroundColor: Palette.warning,
  },
  primaryButtonDanger: {
    backgroundColor: Palette.danger,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});
