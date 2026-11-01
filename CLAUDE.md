@AGENTS.md

# 협업 규칙

## 커밋 작성자
- 커밋은 저장소 주인 명의로 작성: `git config user.name "imtaejugkim"`, `git config user.email "mrtaejung@gmail.com"`
- 커밋 메시지·PR 본문에 `Co-Authored-By`, 세션 링크 등 AI 관련 문구를 넣지 않는다.

## 이슈 / 커밋 / PR 제목 컨벤션
제목 맨 앞에 작업 유형 태그를 붙인다. 형식: `[TAG] 한글 요약`

| 태그 | 의미 |
|---|---|
| [FEAT] | 새로운 기능 구현 |
| [MOD] | 코드 수정 및 내부 파일 수정 |
| [ADD] | 부수적인 코드 추가 및 라이브러리 추가, 새로운 파일 생성 |
| [CHORE] | 버전 코드 수정, 패키지 구조 변경, 타입 및 변수명 변경 등의 작은 작업 |
| [DEL] | 쓸모없는 코드나 파일 삭제 |
| [UI] | UI 작업 |
| [FIX] | 버그 및 오류 해결 |
| [HOTFIX] | issue나 QA에서 문의된 급한 버그 및 오류 해결 |
| [MERGE] | 다른 브랜치와의 MERGE |
| [MOVE] | 프로젝트 내 파일이나 코드의 이동 |
| [RENAME] | 파일 이름 변경 |
| [REFACTOR] | 전면 수정 |
| [DOCS] | README나 WIKI 등의 문서 개정 |

예시: `[FEAT] 그룹원 인증 완료 시 푸시 알림`, `[FIX] 장소 이탈 시 세션이 종료되지 않는 문제 해결`
