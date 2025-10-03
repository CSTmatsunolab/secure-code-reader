import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ClassifiedPayload } from '@/services/payload-classifier/types';
import type { AnalysisStatus, UrlVerdict, UrlAnalysisResult } from '@/services/url-analysis';

export interface ScanHistoryEntry {
  id: string;
  scannedAt: number;
  payload: ClassifiedPayload;
  analysis?: {
    status: AnalysisStatus;
    verdict: UrlVerdict;
    provider: UrlAnalysisResult['provider'];
    detailsUrl?: string;
    lastAnalyzedAt: number;
    stats?: UrlAnalysisResult['stats'];
    engineFindings?: UrlAnalysisResult['engineFindings'];
  };
}

interface AddEntryArgs {
  payload: ClassifiedPayload;
  scannedAt: number;
}

interface UpdateAnalysisArgs {
  entryId: string;
  analysis: UrlAnalysisResult;
}

interface ScanHistoryContextValue {
  entries: ScanHistoryEntry[];
  addEntry: (entry: AddEntryArgs) => void;
  clearHistory: () => void;
  updateEntryAnalysis: (args: UpdateAnalysisArgs) => void;
}

const ScanHistoryContext = createContext<ScanHistoryContextValue | undefined>(undefined);

const MAX_ENTRIES = 50;

const buildEntryId = (payload: ClassifiedPayload) =>
  `${payload.classification.kind}:${payload.classification.rawValue}`;

export function ScanHistoryProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);

  const addEntry = useCallback(({ payload, scannedAt }: AddEntryArgs) => {
    setEntries((prev) => {
      const id = buildEntryId(payload);
      const existing = prev.find((item) => item.id === id);
      const next: ScanHistoryEntry = {
        id,
        payload,
        scannedAt,
        analysis: existing?.analysis,
      };
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [next, ...filtered];
      return updated.slice(0, MAX_ENTRIES);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
  }, []);

  const updateEntryAnalysis = useCallback(({ entryId, analysis }: UpdateAnalysisArgs) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? {
              ...item,
              analysis: {
                status: analysis.status,
                verdict: analysis.verdict,
                provider: analysis.provider,
                detailsUrl: analysis.detailsUrl,
                stats: analysis.stats,
                engineFindings: analysis.engineFindings,
                lastAnalyzedAt: Date.now(),
              },
            }
          : item,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      clearHistory,
      updateEntryAnalysis,
    }),
    [entries, addEntry, clearHistory, updateEntryAnalysis],
  );

  return <ScanHistoryContext.Provider value={value}>{children}</ScanHistoryContext.Provider>;
}

export function useScanHistoryContext() {
  const context = useContext(ScanHistoryContext);
  if (!context) {
    throw new Error('useScanHistoryContext must be used within a ScanHistoryProvider');
  }
  return context;
}
