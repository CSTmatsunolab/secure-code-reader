import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BarcodeScanningResult, CameraView } from 'expo-camera';

import { ScanOverlay } from './scan-overlay';
import { Palette } from '@/constants/theme';

export type PermissionState = 'unknown' | 'granted' | 'denied';

interface Props {
  permission: PermissionState;
  isRequestingPermission: boolean;
  isCameraActive: boolean;
  isInitialising: boolean;
  onRequestPermission: () => void;
  onCodeScanned: (result: BarcodeScanningResult) => void;
  caption?: string;
}

export const QrCameraView = memo(function QrCameraView({
  permission,
  isRequestingPermission,
  isCameraActive,
  isInitialising,
  onRequestPermission,
  onCodeScanned,
  caption = 'QRコードをフレームに収めてください',
}: Props) {
  if (isInitialising) {
    return (
      <View style={styles.permissionState}>
        <ActivityIndicator />
        <Text style={styles.permissionText}>カメラ権限を確認しています…</Text>
      </View>
    );
  }

  if (permission !== 'granted') {
    const message =
      permission === 'denied'
        ? 'カメラ権限が拒否されています。設定アプリで許可してください。'
        : 'カメラへのアクセス許可が必要です。';
    return (
      <View style={styles.permissionState}>
        <Text style={styles.permissionText}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.permissionButton, pressed ? styles.permissionButtonPressed : null]}
          onPress={onRequestPermission}
          disabled={isRequestingPermission}>
          {isRequestingPermission ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.permissionButtonLabel}>権限をリクエスト</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrapper}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isCameraActive ? onCodeScanned : undefined}
        isActive={isCameraActive}
      />
      <ScanOverlay />
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cameraWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#000000',
    width: '100%',
    aspectRatio: 1,
    maxWidth: 360,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  caption: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  permissionState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 24,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: Palette.textMuted,
  },
  permissionButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  permissionButtonPressed: {
    opacity: 0.9,
  },
  permissionButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
