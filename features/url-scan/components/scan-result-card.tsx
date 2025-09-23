import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import type { UrlAnalysisResult, UrlVerdict } from '@/services/url-analysis';

type Props = {
  result: UrlAnalysisResult;
};

const verdictLabel: Record<UrlVerdict, string> = {
  safe: '安全と判定',
  warning: '注意が必要',
  danger: '危険なリンク',
  unknown: '判定保留',
};

const verdictColor: Record<UrlVerdict, string> = {
  safe: '#1E8E3E',
  warning: '#F9AB00',
  danger: '#D93025',
  unknown: '#5F6368',
};

const StatBadge = memo(function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'warning' | 'danger';
}) {
  const palette = {
    neutral: { background: 'rgba(15, 157, 88, 0.12)', text: '#1E8E3E' },
    warning: { background: 'rgba(249, 171, 0, 0.16)', text: '#C47F00' },
    danger: { background: 'rgba(217, 48, 37, 0.16)', text: '#C5221F' },
  }[tone];

  return (
    <View style={[styles.statBadge, { backgroundColor: palette.background }]}>
      <ThemedText style={[styles.statLabel, { color: palette.text }]}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
        {value}
      </ThemedText>
    </View>
  );
});

export const ScanResultCard = memo(function ScanResultCard({ result }: Props) {
  const summary = useMemo(() => {
    if (result.status !== 'completed') {
      return 'VirusTotalの解析結果を取得中です。数秒後に再度スキャンしてください。';
    }

    switch (result.verdict) {
      case 'danger':
        return '複数のエンジンが危険と判定しました。送金リンクや認証情報の入力は避けてください。';
      case 'warning':
        return '未知または疑わしい兆候が検出されています。アクセス前に送信元を再確認してください。';
      case 'safe':
        return '既知の脅威は検出されませんでしたが、不審な挙動に注意してください。';
      default:
        return '十分な情報が得られていません。時間を置いて再スキャンするか、別の方法で確認してください。';
    }
  }, [result.status, result.verdict]);

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="title" style={[styles.verdictTitle, { color: verdictColor[result.verdict] }]}>
        {verdictLabel[result.verdict]}
      </ThemedText>
      <ThemedText style={styles.summary}>{summary}</ThemedText>
      <View style={styles.statsRow}>
        <StatBadge label="Malicious" value={result.stats.malicious} tone="danger" />
        <StatBadge label="Suspicious" value={result.stats.suspicious} tone="warning" />
        <StatBadge label="Harmless" value={result.stats.harmless} tone="neutral" />
      </View>
      <View style={styles.statsRow}>
        <StatBadge label="Undetected" value={result.stats.undetected} tone="neutral" />
        <StatBadge label="Timeout" value={result.stats.timeout} tone="warning" />
      </View>
      {result.detailsUrl ? (
        <ExternalLink href={result.detailsUrl}>
          <ThemedText type="link">VirusTotalで詳細を確認</ThemedText>
        </ExternalLink>
      ) : null}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  card: {
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
  verdictTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  summary: {
    lineHeight: 22,
    color: Palette.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Palette.textSubtle,
  },
});
