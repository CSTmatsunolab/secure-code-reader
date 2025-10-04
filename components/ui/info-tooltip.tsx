import { memo, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';

interface Props {
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'top-left' | 'bottom-left';
  children?: ReactNode;
}

export const InfoTooltip = memo(function InfoTooltip({
  title,
  description,
  placement = 'top',
  children,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible((prev) => !prev)}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.iconPressed : null]}>
        <ThemedText style={styles.iconText}>i</ThemedText>
      </Pressable>
      {visible ? (
        <ThemedView
          style={[
            styles.tooltip,
            placement === 'top' && styles.tooltipTop,
            placement === 'bottom' && styles.tooltipBottom,
            placement === 'top-left' && styles.tooltipTopLeft,
            placement === 'bottom-left' && styles.tooltipBottomLeft,
          ]}>
          <ThemedText type="defaultSemiBold" style={styles.tooltipTitle}>
            {title}
          </ThemedText>
          <ThemedText style={styles.tooltipBody}>{description}</ThemedText>
          {children}
        </ThemedView>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  iconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPressed: {
    opacity: 0.8,
  },
  iconText: {
    fontSize: 13,
    color: Palette.primary,
    fontWeight: '700',
  },
  tooltip: {
    position: 'absolute',
    width: 220,
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 10,
  },
  tooltipTop: {
    bottom: 32,
    right: -16,
  },
  tooltipBottom: {
    top: 32,
    right: -16,
  },
  tooltipTopLeft: {
    bottom: 32,
    right: -80,
  },
  tooltipBottomLeft: {
    top: 32,
    right: -80,
  },
  tooltipTitle: {
    fontSize: 14,
  },
  tooltipBody: {
    fontSize: 13,
    color: Palette.textMuted,
    lineHeight: 18,
  },
});
