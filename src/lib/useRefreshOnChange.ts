import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { onDataChanged } from './events';

/** 화면에 들어올 때 + 세션 데이터가 바뀔 때마다 load() 실행 */
export function useRefreshOnChange(load: () => void) {
  useFocusEffect(useCallback(() => load(), [load]));
  useEffect(() => onDataChanged(load), [load]);
}
