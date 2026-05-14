# GitHub Finder — 개발 계획

이 문서는 프로젝트 초기에 합의한 **기능·기술·범위**를 정리한 계획서입니다. 구현은 본 문서와 [프롬프트 로그](docs/prompt-log.md)에 기록된 요청을 바탕으로 진행했습니다.

---

## 1. 목표

- GitHub **공개** REST API로 사용자 **프로필**과 **최신 공개 저장소 10개**를 조회한다.
- 와이어프레임 수준의 화면 구역을 갖춘다: **검색**, **상태 메시지**, **프로필**, **통계**, **저장소 목록**.
- 실제 API 응답으로 DOM을 채우고, 로딩·에러·빈 입력을 **한국어**로 안내한다.

---

## 2. 스택·구조

- **HTML / CSS / JavaScript만** 사용한다. React, Vite, Tailwind, 번들러는 사용하지 않는다.
- 스크립트는 **루트의 `app.js` 단일 파일**로 유지하고, 역할은 **클래스(OOP)** 로 나눈다.
  - `UrlSafety` — 외부 URL·`mailto`·X 프로필 URL 검증
  - `GitHubClient` — `fetch`, 한도 관련 응답 헤더 해석
  - `FinderView` — DOM 참조 및 프로필·저장소 렌더링
  - `GitHubFinderApp` — 폼 이벤트, 검색 흐름, `AbortController`, 에러 분기
- **ESLint**는 도입하지 않는다.

---

## 3. API·검색 동작

- **비인증**만 사용한다. `Authorization` 헤더를 넣지 않는다.
- 엔드포인트:
  1. `GET /users/{login}` — 사용자 존재·프로필 정보
  2. `GET /users/{login}/repos?per_page=10&sort=updated` — 저장소 목록 (사용자 404 시 두 번째 호출은 하지 않음)
- 검색어는 GitHub **로그인과 정확히 일치**하는 사용자명으로만 조회한다.
- **디바운스·입력 중 자동 검색은 하지 않는다.** Enter 또는 검색 버튼으로만 요청한다.
- 연속 검색 시 이전 요청은 `AbortController`로 취소할 수 있게 한다.
- 403(한도 등)일 때 응답에 `X-RateLimit-Remaining` 등이 있으면 **가능한 범위에서** 안내 문구에 반영한다.

---

## 4. UI·콘텐츠

- 초기 화면은 **데이터 없음(빈 상태)** 로 시작한다.
- 프로필: 아바타, 표시 이름, **@로그인**(GitHub 프로필 링크), 소개. 프로필 페이지로 가기는 **@로그인** 링크만 사용(중복 버튼 없음).
- **링크**: `blog`(웹), `twitter_username`(X), 팔로워·팔로잉 GitHub 탭 링크.
- **연락**: `company`, `location`, 공개 `email`(비인증 `GET /users` 응답에 포함될 때만 UI 표시 가능).
- **이력**: `created_at`, `updated_at`.
- **통계**: 팔로워, 팔로잉, 공개 저장소 수, **공개 Gist** 수.
- 저장소 카드: 이름(저장소 URL), 설명, **포크 여부** 뱃지, **주 언어**, 스타·포크 수, 최근 푸시(또는 갱신)일. 링크는 **새 탭**(`noopener noreferrer`).
- 외부로 나가는 URL은 `http` / `https`만 허용하는 등 **안전한 링크**만 렌더링한다.

---

## 5. 에러·보안

- **한국어** 안내: 빈 입력, 404, 403, 기타 HTTP, 네트워크 실패.
- 사용자 입력·API에서 온 문자열은 **XSS 방지**를 위해 `textContent` 등 안전한 방식으로 DOM에 반영한다.

---

## 6. UX

- 로딩 중임을 알 수 있는 표시.
- CSS **전환(transition)** 등으로 갱신이 거칠지 않게 한다.
- **반응형**: 뷰포트에 맞게 레이아웃이 무너지지 않도록 미디어 쿼리를 둔다.

---

## 7. 문서·범위 밖

- **README**: 기능 요약, 로컬 실행 방법(`npx serve` 등), API **두 번 호출 이유**, 비인증 **한도** 안내, [프롬프트 로그](docs/prompt-log.md)·[UI 트러블슈팅](docs/ui-troubleshooting.md)·**본 계획서** 링크.
- **AGENTS.md**: 작업 이력을 한 줄 단위로 짧게 기록한다.
- **GitHub Pages 배포·CI 파이프라인**은 본 계획 범위에 포함하지 않는다. 필요 시 저장소 관리자가 별도로 구성한다.

---

## 8. Must / Nice (합의 반영)

| 구분 | 내용 |
|------|------|
| **Must** | 비인증 `users` + `repos`, Enter·버튼 검색, 한국어 메시지, 404/403/네트워크 처리, 저장소 10개·새 탭, 단일 `app.js`·클래스 분리, README·로그·계획 문서 |
| **Nice (본 프로젝트에서 구현 포함)** | 프로필·저장소 상세 필드, 링크·연락·이력·Gist 통계, 프로필 이동(`@로그인`·`html_url`), 로딩·전환·반응형, 한도 헤더 활용 가능 시 안내 |

---

## 관련 링크

- [README.md](README.md)
- [docs/prompt-log.md](docs/prompt-log.md)
- [docs/ui-troubleshooting.md](docs/ui-troubleshooting.md)
