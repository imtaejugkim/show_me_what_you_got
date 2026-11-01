// app.json 을 기본으로, 비밀 값(API 키)처럼 .env 에서 읽어야 하는 설정만 여기서 덧붙입니다.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      // 네이버 지도: 네이버 클라우드 플랫폼(NCP) Maps 의 Client ID
      '@mj-studio/react-native-naver-map',
      { client_id: process.env.NAVER_MAP_CLIENT_ID ?? '' },
    ],
    [
      // 네이버 지도 SDK 는 Maven Central 이 아니라 네이버 저장소에서 받아야 함
      'expo-build-properties',
      { android: { extraMavenRepos: ['https://repository.map.naver.com/archive/maven'] } },
    ],
  ],
});
