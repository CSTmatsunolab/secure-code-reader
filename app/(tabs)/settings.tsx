import { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { Palette } from '@/constants/theme';

const PRIVACY_POLICY_URL = 'https://example.com/privacy';

export default function SettingsScreen() {
  const {
    useVirusTotal,
    alwaysShowStrongWarning,
    toggleUseVirusTotal,
    toggleAlwaysShowStrongWarning,
  } = useSettings();

  const handleOpenPrivacyPolicy = useCallback(() => {
    Linking.openURL(PRIVACY_POLICY_URL).catch((err) => {
      console.warn('Failed to open privacy policy', err);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.heading}>
          設定
        </ThemedText>
        <ThemedText style={styles.description}>
          アプリの振る舞いとセキュリティポリシーを調整できます。
        </ThemedText>

        <ThemedView style={styles.section}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <ThemedText type="subtitle" style={styles.optionTitle}>
                VirusTotalを利用して詳細判定
              </ThemedText>
              <ThemedText style={styles.caption}>
                有効にすると URL を VirusTotal API へ送信し、最新のスキャン結果を自動取得します。
              </ThemedText>
            </View>
            <Switch
              value={useVirusTotal}
              onValueChange={toggleUseVirusTotal}
              trackColor={{ false: 'rgba(148, 163, 184, 0.35)', true: Palette.primary }}
              thumbColor={useVirusTotal ? '#ffffff' : '#f1f5f9'}
            />
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <ThemedText type="subtitle" style={styles.optionTitle}>
                強警告を常に表示
              </ThemedText>
              <ThemedText style={styles.caption}>
                送金リンクやディープリンクを開く前に、必ず確認ダイアログで合意を求めます。
              </ThemedText>
            </View>
            <Switch
              value={alwaysShowStrongWarning}
              onValueChange={toggleAlwaysShowStrongWarning}
              trackColor={{ false: 'rgba(148, 163, 184, 0.35)', true: Palette.primary }}
              thumbColor={alwaysShowStrongWarning ? '#ffffff' : '#f1f5f9'}
            />
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <Pressable
            accessibilityRole="link"
            onPress={handleOpenPrivacyPolicy}
            style={({ pressed }) => [styles.linkRow, pressed ? styles.linkRowPressed : null]}>
            <View style={styles.labelGroup}>
              <ThemedText type="subtitle" style={styles.optionTitle}>
                プライバシーポリシー
              </ThemedText>
              <ThemedText style={styles.caption}>{PRIVACY_POLICY_URL}</ThemedText>
            </View>
            <ThemedText style={styles.linkCaret}>›</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
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
  heading: {
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  section: {
    padding: 22,
    gap: 18,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  labelGroup: {
    flex: 1,
    gap: 6,
  },
  optionTitle: {
    fontSize: 18,
  },
  caption: {
    fontSize: 13,
    color: Palette.textMuted,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  linkRowPressed: {
    opacity: 0.75,
  },
  linkCaret: {
    fontSize: 28,
    color: Palette.textSubtle,
    lineHeight: 28,
  },
});
