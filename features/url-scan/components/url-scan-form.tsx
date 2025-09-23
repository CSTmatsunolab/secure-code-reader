import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isVirusTotalConfigured } from '@/services/config/api-key-provider';
import type { UrlAnalysisResult } from '@/services/url-analysis';

import { useUrlScan } from '../hooks/use-url-scan';
import { ScanResultCard } from './scan-result-card';

interface Props {
  initialUrl?: string;
  title?: string;
  onResult?: (result: UrlAnalysisResult) => void;
}

export function UrlScanForm({ initialUrl = '', title = 'URLの安全性チェック', onResult }: Props) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const hasApiKey = isVirusTotalConfigured();
  const { url, setUrl, status, submit, error, result } = useUrlScan(initialUrl);
  const isSubmitting = status === 'submitting';

  const placeholderColor = useMemo(
    () => (colorScheme === 'dark' ? '#9BA1A6' : '#8E8E8E'),
    [colorScheme],
  );

  const disableButton = !hasApiKey || isSubmitting || url.trim().length === 0;

  useEffect(() => {
    if (!initialUrl) {
      return;
    }
    setUrl(initialUrl);
  }, [initialUrl, setUrl]);

  useEffect(() => {
    if (result && onResult) {
      onResult(result);
    }
  }, [result, onResult]);

  const handlePress = useCallback(() => {
    if (!disableButton) {
      submit();
    }
  }, [disableButton, submit]);

  return (
    <ThemedView style={styles.wrapper}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {!hasApiKey ? (
        <ThemedText style={styles.notice}>
          config/local-api-keys.json の "virusTotal.apiKey" を設定するとVirusTotalで判定できます。
        </ThemedText>
      ) : null}
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://example.com/payment"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        textContentType="URL"
        style={[
          styles.input,
          {
            borderColor: colorScheme === 'dark' ? '#36393F' : Palette.cardBorder,
            backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : Palette.surfaceMuted,
            color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
          },
        ]}
        accessibilityLabel="解析したいURLを入力"
        returnKeyType="done"
        onSubmitEditing={handlePress}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: isSubmitting, disabled: disableButton }}
        disabled={disableButton}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: tint },
          disableButton && styles.buttonDisabled,
          pressed && !disableButton ? styles.buttonPressed : null,
        ]}>
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.buttonLabel}>
            安全性を判定する
          </ThemedText>
        )}
      </Pressable>
      {error ? (
        <ThemedText type="defaultSemiBold" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}
      {result ? (
        <View style={styles.resultSpacing}>
          <ScanResultCard result={result} />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 18,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    backgroundColor: Palette.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  notice: {
    fontSize: 13,
    color: Palette.danger,
    lineHeight: 18,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: Palette.danger,
  },
  resultSpacing: {
    marginTop: 12,
  },
});
