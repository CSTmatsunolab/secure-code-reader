// Web でもライトモード固定。SSR/Hydration まわりの処理は不要になるため簡略化。
import type { ColorSchemeName } from 'react-native';

export function useColorScheme(): ColorSchemeName {
  return 'light';
}
