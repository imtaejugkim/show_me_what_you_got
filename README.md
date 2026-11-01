# Show Me What You Got 💪📚

> 혼자서는 매번 실패하는 사람들을 위한 "증명" 앱.
> 등록한 헬스장·독서실에 **도착하면 알림 → 시작 → 장소를 벗어나면 자동 종료 → 최소 시간 채웠으면 증명 완료**.
> 그룹 초대코드로 친구들과 오늘 누가 증명했는지 서로 확인합니다.

## 기술 스택

| 역할 | 사용 기술 | 안드로이드로 치면 |
|---|---|---|
| 앱 프레임워크 | React Native + **Expo** (SDK 58) | - |
| 화면 이동 | **Expo Router** (파일 기반 라우팅) | Navigation Component |
| 장소 도착/이탈 감지 | `expo-location` 지오펜싱 + `expo-task-manager` | GeofencingClient + BroadcastReceiver |
| 알림 | `expo-notifications` (액션 버튼 포함) | NotificationCompat + Action |
| 지도 | 네이버 지도 (`@mj-studio/react-native-naver-map`) | Naver Map SDK |
| 기기 저장소 | AsyncStorage | SharedPreferences |
| 서버(그룹/로그인/DB) | **Supabase** (Postgres + 익명 로그인) | Firebase 같은 BaaS |

## 폴더 구조

```
index.ts                  # 진입점. 지오펜스 백그라운드 task를 가장 먼저 등록
app.json                  # 앱 이름, 패키지명, 권한 설정 (AndroidManifest/Info.plist는 여기서 자동 생성)
eas.json                  # 클라우드 빌드 설정
supabase/schema.sql       # DB 테이블 + 권한 + 함수 (Supabase SQL Editor에 붙여넣기)
src/
  app/                    # 📱 화면 (파일 = 화면)
    _layout.tsx           #   최상위: 알림 처리, 동기화
    (tabs)/_layout.tsx    #   하단 탭
    (tabs)/index.tsx      #   오늘 (진행 중 세션, 오늘 증명)
    (tabs)/places.tsx     #   장소 목록 + 지도
    place/new.tsx         #   네이버 지도에서 탭해서 장소 고르기
    (tabs)/groups.tsx     #   그룹 목록/생성/참여
    group/[id].tsx        #   그룹 상세 (멤버별 오늘 현황)
  lib/                    # 🧠 로직
    geofence.ts           #   도착/이탈 → 알림 / 자동 종료
    sessions.ts           #   세션 시작·종료·증명 판정·서버 동기화
    notifications.ts      #   알림 채널, 버튼, 알림 내용
    responses.ts          #   알림 버튼 눌렀을 때
    groups.ts             #   그룹 API
    supabase.ts           #   서버 클라이언트 + 익명 로그인
    places.ts             #   장소 추가/삭제 + 지오펜스 갱신
    storage.ts            #   기기 저장소
    types.ts              #   타입, 최소 인증 시간(MIN_MINUTES)
  components/ui.tsx       # 디자인 시스템 (색·글자·버튼·카드 등 공통 UI)
```

## 핵심 흐름

```
[장소 등록] ──► OS에 지오펜스 등록 (반경 100~300m)
      │
      ▼ (앱이 꺼져 있어도 OS가 깨워줌)
[장소 진입] ──► "OO 헬스장 도착! 시작할까요?" 알림 [시작하기] [오늘은 패스]
      │ 시작하기
      ▼
[진행 중] ──► 그룹원에게 🔥 진행 중으로 보임
      │ 장소 이탈 (자동) 또는 종료 버튼 (수동)
      ▼
[종료] ──► 머문 시간 ≥ 최소 시간(운동 30분 / 공부 60분)? ✅ 증명 완료 : ⚠️ 시간 부족
```

---

## 1. 처음 한 번: 개발 환경 준비

1. **Node.js 20 이상** 설치 (`node -v` 로 확인)
2. **Android Studio** (이미 있으실 거예요) — SDK, 에뮬레이터, `adb` 사용
3. (iOS 테스트하려면) **Mac + Xcode**, 또는 Mac이 없으면 EAS 클라우드 빌드 사용
4. 의존성 설치:
   ```bash
   git clone https://github.com/imtaejugkim/show_me_what_you_got.git
   cd show_me_what_you_got
   npm install
   ```

## 2. (선택) 서버 설정 — 그룹 기능 쓰려면

서버 없이도 "혼자 모드"(장소 등록, 자동 감지, 오늘 증명)는 동작합니다. 그룹 기능은 Supabase가 필요해요. (무료 플랜으로 충분)

1. https://supabase.com 가입 → **New project** 생성
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣기 → **Run**
3. **Authentication → Sign In / Providers → Anonymous sign-ins** 켜기
4. **Project Settings → API** 에서 `Project URL`, `anon public` 키 복사
5. 프로젝트 루트에 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   # 그리고 .env 안에 URL과 KEY 붙여넣기
   ```
   `.env` 는 git에 올라가지 않습니다. 값을 바꾸면 `npx expo start -c` 로 캐시 지우고 재시작하세요.

## 2-1. 지도 설정 — 네이버 지도 Client ID

장소는 **네이버 지도**에서 현재 위치를 중심으로 띄운 뒤, 지도를 탭한 좌표로 등록합니다. 키가 없으면 지도가 표시되지 않아요 (다른 기능은 정상).

1. https://www.ncloud.com 가입 → 콘솔 → **Services → Application Services → Maps**
2. **Application 등록** → Dynamic Map 선택
   - Android 앱 패키지 이름: `com.imtaejugkim.showmewhatyougot`
   - iOS Bundle ID: `com.imtaejugkim.showmewhatyougot`
3. 생성된 Application 의 **Client ID** 복사 → `.env` 에 추가:
   ```
   NAVER_MAP_CLIENT_ID=복사한ClientID
   ```
4. 네이티브 설정이라 **다시 빌드**해야 반영됩니다: `npx expo run:android`

## 3. 실행하기 (개발 빌드)

⚠️ **Expo Go 앱으로는 안 됩니다.** 이 앱은 백그라운드 위치(지오펜싱)를 쓰기 때문에, 내 앱 전용 "개발 빌드"가 필요해요.
개념: **네이티브 껍데기(APK)는 1번만 빌드**하고, 이후 JS 코드 수정은 저장 즉시 반영(Fast Refresh)됩니다.

### Android (로컬 빌드 — 추천)

에뮬레이터를 켜두거나 USB 디버깅 폰을 연결한 뒤:

```bash
npx expo run:android
```

- 처음엔 `android/` 폴더가 자동 생성되고 Gradle 빌드가 돌아서 몇 분 걸립니다.
- `android/` 폴더는 **직접 수정하지 마세요** (gitignore 되어 있고, `app.json` 기준으로 매번 재생성됨). 권한/설정은 `app.json` 에서 바꿉니다.
- 다음부터는 네이티브 라이브러리를 추가한 게 아니면 그냥:
  ```bash
  npx expo start
  ```
  하고 폰에 설치된 앱을 열면 됩니다. 터미널에서 `r` = 리로드, `j` = 디버거.

### iOS

- **Mac 있음**: `npx expo run:ios` (시뮬레이터) 또는 `npx expo run:ios --device` (실기기, Apple ID 필요)
- **Mac 없음**: EAS 클라우드 빌드
  ```bash
  npm install -g eas-cli
  eas login
  eas build --profile development --platform ios
  ```
  실기기 설치는 Apple Developer Program($99/년) 계정이 필요합니다.

## 4. 테스트 방법

### 빠른 테스트 (실제로 안 움직여도 됨)
1. **장소** 탭 → 오른쪽 위 **+** → 현재 위치 중심 지도에서 원하는 곳을 **탭** (또는 주소 검색) → 이름/종류/반경 선택 → **이 위치로 등록**
2. 위치 권한은 **"항상 허용"** 선택 (안드로이드 11+는 설정 화면으로 이동함)
3. 장소 목록에서 장소를 눌러 **🧪 도착 테스트** → 알림이 뜨면 **시작하기**
4. **오늘** 탭에서 진행 중 확인 → 장소 메뉴의 **🧪 이탈 테스트** 또는 **종료하기**
   - 바로 종료하면 "⚠️ 시간 부족"이 정상입니다. 빨리 확인하려면 `src/lib/types.ts` 의 `MIN_MINUTES` 를 `1` 로 바꿔 보세요.

(🧪 버튼은 개발 빌드에서만 보이고, 배포 빌드에서는 자동으로 사라집니다)

### 진짜 지오펜스 테스트 (에뮬레이터)
1. 에뮬레이터 `...` (Extended controls) → **Location** → 지도에서 장소 A 찍고 **Set location**
2. 앱에서 그 위치로 장소 등록
3. 멀리 떨어진 B로 위치 변경 → 다시 A로 변경 → 1~2분 내 도착 알림
4. 다시 B로 이동 → 세션 자동 종료 알림
   - Google Play 이미지 에뮬레이터 사용 권장. 지오펜스는 OS가 배터리 아끼려고 **수십 초~몇 분 늦게** 오는 게 정상이에요.

### 실기기
실제로 헬스장 가보는 게 최고의 테스트입니다 😄 반경은 150m 이상 추천 (실내 GPS 오차).

### 그룹 테스트
에뮬레이터 + 실기기(또는 에뮬레이터 2대)로 각각 앱 실행 → 한쪽에서 그룹 만들기 → 초대코드를 다른 쪽에서 입력.

## 5. 배포 (Play Store / App Store)

```bash
eas build --profile preview --platform android     # 친구들에게 돌릴 테스트용 APK
eas build --profile production --platform all      # 스토어 제출용 (AAB / IPA)
eas submit --platform android                      # Play Console 업로드
eas submit --platform ios                          # App Store Connect 업로드
```

스토어 심사 주의: **백그라운드 위치 권한**은 Google Play에서 별도 신고서(사용 목적 설명 + 시연 영상)가 필요하고, Apple도 사용 목적 문구를 꼼꼼히 봅니다. 미리 준비하세요.

## 자주 쓰는 명령어

```bash
npx expo start            # 개발 서버 (이미 개발 빌드가 설치되어 있을 때)
npx expo start -c         # 캐시 지우고 시작 (.env 바꿨을 때)
npx expo run:android      # 네이티브 다시 빌드 + 설치 (네이티브 라이브러리 추가 시)
npx expo install <패키지>  # 라이브러리 추가 (npm install 대신 이걸로! SDK 호환 버전 자동 선택)
npm run typecheck         # 타입 검사
npx expo-doctor           # 설정/의존성 문제 진단
```

## 다음에 해볼 것 (아이디어)

- [ ] 연속 증명 스트릭 🔥, 주간 리포트
- [ ] 그룹별 규칙 (최소 시간, 주 N회 목표), 벌금/내기
- [ ] 그룹원이 증명하면 푸시 알림 (Supabase Edge Function + Expo Push)
- [ ] 사진 인증 추가 (위치 조작 방지)
- [ ] 카카오/애플 로그인으로 익명 계정 연결
