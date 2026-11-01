// 앱 진입점.
// 백그라운드 작업(지오펜스)은 앱이 꺼져 있어도 실행될 수 있어서,
// 화면(라우터)보다 먼저 전역 스코프에서 등록해야 합니다.
import './src/lib/geofence';
import 'expo-router/entry';
