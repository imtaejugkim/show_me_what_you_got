// app.json 을 기본으로, 비밀 값(API 키)처럼 .env 에서 읽어야 하는 설정만 여기서 덧붙입니다.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-maps',
      {
        // 안드로이드 지도(Google Maps)용 키. iOS 는 Apple 지도를 써서 키가 필요 없습니다.
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
  ],
});
