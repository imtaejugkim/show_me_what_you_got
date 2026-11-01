// 진동(햅틱) 규칙을 한곳에 모아둔 파일.
// 원칙: 모든 탭에 진동을 주지 않고, "의미 있는 순간"에만 짧게 준다.
//  - selection : 값을 고를 때 (세그먼트, 지도에서 위치 선택)
//  - light     : 주요 버튼(라임색)을 누를 때
//  - success   : 시작/증명 완료/등록/그룹 참여처럼 일이 성공했을 때
//  - warning   : 시간 부족으로 끝났을 때처럼 주의가 필요할 때
//  - error     : 장소 밖이라 시작할 수 없을 때 등 실패했을 때
import * as Haptics from 'expo-haptics';

const run = (p: Promise<void>) => p.catch(() => {});

export const haptic = {
  selection: () => run(Haptics.selectionAsync()),
  light: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
