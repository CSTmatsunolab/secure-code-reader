import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { BarcodeScanningResult, Camera, PermissionResponse, PermissionStatus, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export type ScannerPermissionStatus = 'unknown' | 'granted' | 'denied';

export interface QrScanResult {
  data: string;
  type: string;
  scannedAt: number;
  origin: 'camera' | 'library';
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
  isProcessingImage: boolean;
  scanImageFromLibrary: () => Promise<void>;
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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
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
      const response: PermissionResponse = await Camera.requestCameraPermissionsAsync();
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
          origin: 'camera',
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
    setIsProcessingImage(false);
    if (permission === 'granted') {
      setIsCameraActive(true);
    }
  }, [permission]);

  const scanImageFromLibrary = useCallback(async () => {
    if (isProcessingImage) {
      return;
    }

    setError(undefined);
    const wasCameraActive = permission === 'granted' && isCameraActive;
    if (wasCameraActive) {
      setIsCameraActive(false);
    }

    setIsProcessingImage(true);

    try {
      const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      let hasPermission = mediaPermission.granted;

      if (!hasPermission && mediaPermission.canAskAgain) {
        const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
        hasPermission = requested.granted;
      }

      if (!hasPermission) {
        setError('フォトライブラリへのアクセスが拒否されています。設定アプリで許可してください。');
        if (wasCameraActive || (permission === 'granted' && (!result || !pauseAfterScan))) {
          setIsCameraActive(true);
        }
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
        base64: false,
        exif: false,
      });

      if (pickerResult.canceled) {
        if (wasCameraActive || (permission === 'granted' && (!result || !pauseAfterScan))) {
          setIsCameraActive(true);
        }
        return;
      }

      const asset = pickerResult.assets?.[0];
      if (!asset?.uri) {
        setError('画像を読み込めませんでした。');
        if (wasCameraActive || (permission === 'granted' && (!result || !pauseAfterScan))) {
          setIsCameraActive(true);
        }
        return;
      }

  const scannedResults = await scanFromURLAsync(asset.uri, ['qr']);
  const match = scannedResults.find((candidate: BarcodeScanningResult) => Boolean(candidate.data));

      if (!match?.data) {
        setError('画像からQRコードを検出できませんでした。');
        if (wasCameraActive || (permission === 'granted' && (!result || !pauseAfterScan))) {
          setIsCameraActive(true);
        }
        return;
      }

      setResult({
        data: match.data,
        type: match.type ?? 'qr',
        scannedAt: Date.now(),
        origin: 'library',
      });

      if (!pauseAfterScan && permission === 'granted') {
        setIsCameraActive(true);
      } else {
        setIsCameraActive(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の解析に失敗しました。');
      if (permission === 'granted' && (!result || !pauseAfterScan)) {
        setIsCameraActive(true);
      }
    } finally {
      setIsProcessingImage(false);
    }
  }, [
    isProcessingImage,
    isCameraActive,
    pauseAfterScan,
    permission,
    result,
  ]);

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
    isProcessingImage,
    scanImageFromLibrary,
  };
};
