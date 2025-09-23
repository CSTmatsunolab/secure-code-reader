import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { BarcodeScanningResult, Camera, CameraPermissionResponse, PermissionStatus } from 'expo-camera';

export type ScannerPermissionStatus = 'unknown' | 'granted' | 'denied';

export interface QrScanResult {
  data: string;
  type: string;
  scannedAt: number;
}

interface UseQrScannerOptions {
  pauseAfterScan?: boolean;
}

interface UseQrScannerReturn {
  permission: ScannerPermissionStatus;
  isRequestingPermission: boolean;
  isCameraActive: boolean;
  isInitialising: boolean;
  error?: string;
  result: QrScanResult | null;
  requestPermission: () => Promise<void>;
  reset: () => void;
  handleCodeScanned: (result: BarcodeScanningResult) => void;
}

const mapPermission = (status: PermissionStatus): ScannerPermissionStatus => {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      return 'unknown';
  }
};

export const useQrScanner = (options: UseQrScannerOptions = {}): UseQrScannerReturn => {
  const { pauseAfterScan = true } = options;
  const [permission, setPermission] = useState<ScannerPermissionStatus>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [error, setError] = useState<string>();
  const [isInitialising, setIsInitialising] = useState(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const initialisePermission = useCallback(async () => {
    try {
      const current = await Camera.getCameraPermissionsAsync();
      const mapped = mapPermission(current.status);
      setPermission(mapped);
      if (mapped === 'granted') {
        setIsCameraActive(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'カメラの状態取得に失敗しました。');
    } finally {
      setIsInitialising(false);
    }
  }, []);

  useEffect(() => {
    initialisePermission();
  }, [initialisePermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;
      if (nextState === 'active') {
        if (permission === 'granted' && !result) {
          setIsCameraActive(true);
        }
      } else {
        setIsCameraActive(false);
      }
    });
    return () => subscription.remove();
  }, [permission, result]);

  const requestPermission = useCallback(async () => {
    if (isRequestingPermission) {
      return;
    }
    setIsRequestingPermission(true);
    try {
      const response: CameraPermissionResponse = await Camera.requestCameraPermissionsAsync();
      const mapped = mapPermission(response.status);
      setPermission(mapped);
      if (mapped === 'granted' && !result) {
        setIsCameraActive(true);
      }
      if (mapped === 'denied') {
        setError('カメラ権限が拒否されています。設定アプリで許可してください。');
      } else {
        setError(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'カメラ権限の取得に失敗しました。');
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission, result]);

  const handleCodeScanned = useCallback(
    (scanned: BarcodeScanningResult) => {
      if (!scanned?.data) {
        return;
      }
      setResult((prev) => {
        if (prev) {
          return prev;
        }
        return {
          data: scanned.data,
          type: scanned.type,
          scannedAt: Date.now(),
        };
      });
      if (pauseAfterScan) {
        setIsCameraActive(false);
      }
    },
    [pauseAfterScan],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(undefined);
    if (permission === 'granted') {
      setIsCameraActive(true);
    }
  }, [permission]);

  useEffect(() => {
    if (permission !== 'granted') {
      setIsCameraActive(false);
    }
  }, [permission]);

  return {
    permission,
    isRequestingPermission,
    isCameraActive: permission === 'granted' && isCameraActive,
    isInitialising,
    error,
    result,
    requestPermission,
    reset,
    handleCodeScanned,
  };
};
