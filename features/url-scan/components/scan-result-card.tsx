import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Palette } from '@/constants/theme';
import type { InternalListResult, UrlAnalysisResult, UrlVerdict } from '@/services/url-analysis';

type Props = {
  result: UrlAnalysisResult;
};

const verdictLabel: Record<UrlVerdict, string> = {
  safe: '✓ 安全なリンク',
  warning: '⚠️ 注意が必要',
  danger: '⛔ 危険なリンク',
  unknown: '❓ 判定できません',
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

const InternalListWarning = memo(function InternalListWarning({
  result,
}: {
  result: InternalListResult;
}) {
  return (
    <ThemedView style={styles.warningCard}>
      <View style={styles.warningHeader}>
        <ThemedText type="title" style={styles.warningTitle}>
          ⚠️ 注意が必要なサービス
        </ThemedText>
        <ThemedText style={styles.warningSubtitle}>
          内部リストに登録されているサービスです
        </ThemedText>
      </View>
      <View style={styles.warningDetails}>
        <View style={styles.warningDetailRow}>
          <ThemedText type="defaultSemiBold" style={styles.warningLabel}>
            サービス名
          </ThemedText>
          <ThemedText style={styles.warningValue}>{result.serviceName}</ThemedText>
        </View>
        <View style={styles.warningDetailRow}>
          <ThemedText type="defaultSemiBold" style={styles.warningLabel}>
            カテゴリ
          </ThemedText>
          <ThemedText style={styles.warningValue}>{result.category}</ThemedText>
        </View>
        {result.notice ? (
          <View style={styles.warningNoticeContainer}>
            <ThemedText type="defaultSemiBold" style={styles.warningLabel}>
              注意事項
            </ThemedText>
            <ThemedText style={styles.warningNotice}>{result.notice}</ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
});

export const ScanResultCard = memo(function ScanResultCard({ result }: Props) {
  const findings = result.engineFindings ?? [];
  const summaryConfig = useMemo(() => {
    if (result.status !== 'completed') {
      return {
        title: 'VirusTotalの解析結果を取得中です。',
        description: '数秒後に再度スキャンしてください。'
      };
    }

    switch (result.verdict) {
      case 'danger':
        return {
          title: '🚨 このリンクは危険です',
          description: '複数のセキュリティエンジンがこのリンクを危険と判定しました。個人情報の入力、送金、ログインなどは絶対に行わないでください。'
        };
      case 'warning':
        return {
          title: '⚠️ このリンクには注意が必要です',
          description: '疑わしい兆候が検出されています。送信元が本当に信頼できるか、URLが正しいかを慎重に確認してからアクセスしてください。'
        };
      case 'safe':
        return {
          title: '✅ このリンクは安全そうです',
          description: '既知の脅威は検出されませんでしたが、念のため不審な挙動がないか注意してください。'
        };
      default:
        return {
          title: 'ℹ️ 判定に十分な情報が得られませんでした',
          description: '時間を置いて再スキャンするか、別の方法で安全性を確認することをお勧めします。'
        };
    }
  }, [result.status, result.verdict]);

  return (
    <ThemedView style={styles.card}>
      {/* 内部リストの警告を最初に表示（listed: true の場合のみ） */}
      {result.internalListResult?.listed && (
        <InternalListWarning result={result.internalListResult} />
      )}
      
      <ThemedText type="title" style={[styles.verdictTitle, { color: verdictColor[result.verdict] }]}>
        {verdictLabel[result.verdict]}
      </ThemedText>
      <View style={styles.summaryContainer}>
        <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>
          {summaryConfig.title}
        </ThemedText>
        <ThemedText style={styles.summaryDescription}>
          {summaryConfig.description}
        </ThemedText>
      </View>
      <View style={styles.statsRow}>
        <StatBadge label="危険判定" value={result.stats.malicious} tone="danger" />
        <StatBadge label="要注意" value={result.stats.suspicious} tone="warning" />
        <StatBadge label="安全判定" value={result.stats.harmless} tone="neutral" />
        <StatBadge label="検出なし" value={result.stats.undetected} tone="neutral" />
        <StatBadge label="判定不能" value={result.stats.timeout} tone="warning" />
        <InfoTooltip
          title="判定値について"
          description="各数値は、複数のセキュリティエンジンによる評価の件数を示しています。危険判定・要注意が多いほどリスクが高く、安全判定が多いほど安全性が高いことを表します。検出なしは脅威が見つからなかった件数、判定不能は判定が完了しなかった件数です。"
          placement="top-left"
        />
      </View>
      {result.detailsUrl ? (
        <ExternalLink href={result.detailsUrl as any}>
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
  summaryContainer: {
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#11181C',
  },
  summaryDescription: {
    fontSize: 15,
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
  findingsBlock: {
    gap: 12,
  },
  findingsTitle: {
    fontSize: 16,
  },
  findingsList: {
    gap: 12,
  },
  findingItem: {
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    padding: 12,
    backgroundColor: Palette.surfaceMuted,
  },
  findingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  findingBadgeDanger: {
    backgroundColor: 'rgba(217, 48, 37, 0.16)',
  },
  findingBadgeWarning: {
    backgroundColor: 'rgba(196, 127, 0, 0.16)',
  },
  findingBadgeText: {
    fontSize: 12,
    color: '#111727',
  },
  findingEngine: {
    fontSize: 15,
    fontWeight: '600',
  },
  findingThreat: {
    fontSize: 14,
    color: Palette.textMuted,
  },
  findingsNote: {
    fontSize: 12,
    color: Palette.textSubtle,
  },
  // 内部リスト警告のスタイル
  warningCard: {
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F9AB00',
    backgroundColor: 'rgba(249, 171, 0, 0.08)',
    marginBottom: 16,
  },
  warningHeader: {
    gap: 4,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C47F00',
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#C47F00',
  },
  warningDetails: {
    gap: 12,
  },
  warningDetailRow: {
    gap: 4,
  },
  warningLabel: {
    fontSize: 13,
    color: '#8B5A00',
  },
  warningValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  warningNoticeContainer: {
    gap: 6,
    marginTop: 4,
  },
  warningNotice: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  warningFooter: {
    fontSize: 13,
    color: '#8B5A00',
    fontStyle: 'italic',
  },
});
