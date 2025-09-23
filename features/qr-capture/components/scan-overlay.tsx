import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

export const ScanOverlay = memo(function ScanOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={styles.frameContainer}>
        <View style={styles.frame} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  frame: {
    width: '86%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
  },
});
