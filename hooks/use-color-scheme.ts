// テーマを常にライトモードとして扱いたい場合の上書き実装。
// 端末がダークモードでも "light" を返すことで、白文字化を防ぎ黒ベースの文字色を維持します。
// 将来システム設定に追従したくなったら、以下を元の実装に戻してください:
//   export { useColorScheme } from 'react-native';
import type { ColorSchemeName } from 'react-native';

export function useColorScheme(): ColorSchemeName {
	return 'light';
}
