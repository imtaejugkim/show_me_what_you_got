// 세션 상태가 바뀌면 화면들이 새로고침할 수 있도록 하는 아주 단순한 이벤트 버스
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDataChanged() {
  listeners.forEach((fn) => fn());
}
