# GitHub Finder

GitHub 공개 API(비인증)로 **사용자 프로필**과 **최신 공개 저장소 10개**를 조회하는 정적 웹 페이지입니다. HTML, CSS, **단일 `app.js`**(클래스 기반)만 사용하며, 화면은 **GitHub.com 프로필과 비슷한 톤**(라이트/다크, Octicons 스타일 SVG, vcard형 정보 줄)으로 구성합니다.

## 1. 기능

- GitHub **로그인과 정확히 일치**하는 사용자명으로 검색(Enter 또는 검색 버튼). 검색 필드 왼쪽에 **돋보기 아이콘**(문서 내 SVG 스프라이트).
- **최근 검색**: 조회가 **성공**한 로그인만 **로컬스토리지**에 최대 **10개**까지 저장. 검색창 아래 **칩**으로 표시되며, 넘치면 **가로로 스크롤**해 볼 수 있고, 칩 클릭 시 바로 재검색, **×**로 항목별 삭제.
- 프로필: 아바타, 표시 이름, **@로그인**(GitHub 사용자 프로필 `html_url`로 연결·작은 글씨·호버 시 밑줄 없이 배경·테두리 톤으로 강조), 소개(`bio`)는 **내용이 있을 때만** 표시.
- **팔로워·팔로잉**: 이름 아래 한 줄로 **축약 숫자**(`formatGhCount`, 예: `12k`)와 GitHub **팔로워/팔로잉 탭** 링크.
- **연락·링크·이력**: `ul#profile-vcard` **한 리스트**에 아이콘 + 텍스트/링크(소속, 위치, 웹 `blog`, 공개 `email`, X `twitter_username`, 가입·프로필 갱신일). **값이 있는 항목만** DOM에 넣고, 한 건도 없으면 리스트 전체를 숨김.
- **통계 줄**(`#stats-row`): **공개 저장소 수**와 **공개 Gist 수**만 표시(아이콘: 저장소는 `repo`, Gist는 `code-square`로 구분).
- 저장소 목록: 항목당 **저장소 아이콘** + 이름 링크(새 탭), 포크면 **포크** 뱃지, 설명·**주 언어**(색 점 + 이름, `LANG_COLOR` 매핑)·**스타·포크**·**업데이트일**은 **데이터가 있을 때만** 해당 블록 표시. 숫자는 `formatGhCount`로 표기.
- 최신 업데이트 순 저장소 10개, 링크는 `noopener noreferrer`.
- 빈 입력, 404, 403(요청 한도), 네트워크 오류 등 **한국어 안내**. 비인증 한도가 남아 있으면 `X-RateLimit-Remaining` 등을 참고해 안내 문구에 반영할 수 있는 경우 반영.
- **공개 이메일**: 비인증 `GET /users/{login}` 응답의 `email`은 GitHub 정책상 **대부분 `null`**이라, 웹 프로필에 이메일이 있어도 앱에는 안 나올 수 있음(상세는 [docs/ui-troubleshooting.md](docs/ui-troubleshooting.md)).

## 2. 검색 한 번에 API가 두 번 호출되는 이유

1. `GET /users/{login}` — 사용자 정보  
2. `GET /users/{login}/repos?...` — 저장소 목록  

GitHub REST API는 두 정보를 한 URL로 합쳐 주지 않습니다. 사용자가 없으면(404) 두 번째 호출은 하지 않습니다.

## 3. 비인증 API 한도

- IP 기준으로 시간당 요청 수에 제한이 있습니다(대략 **60회/시간** 수준으로 이해하면 됩니다).  
- 상세는 GitHub 공식 문서를 참고하세요: [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

## 4. 로컬에서 실행하는 방법

스크립트가 **`app.js` 한 파일**이므로 `index.html`을 **`file://`로 연 뒤**에도 동작하는 경우가 많습니다. 다만 브라우저·환경에 따라 `fetch`가 막힐 수 있어, 아래처럼 **정적 서버**로 여는 편이 더 안정적입니다.

```bash
cd /path/to/github-finder
npx --yes serve .
```

터미널에 표시된 `http://localhost:…` 주소로 브라우저에서 열면 됩니다.  
(`python3 -m http.server` 등 다른 정적 서버도 가능합니다.)

## 5. 스크립트 구조 (OOP)

[`app.js`](app.js) 한 파일 안에 역할을 나눈 클래스가 있습니다.

| 클래스 | 역할 |
|--------|------|
| `UrlSafety` | 외부 URL·`mailto`·트위터 프로필 URL 검증 (정적 메서드) |
| `GitHubClient` | GitHub REST 호출·한도 헤더 해석 |
| `FinderView` | DOM 바인딩, 프로필(vcard·인라인 팔로워/팔로잉·통계 줄), 저장소 목록·메타, `formatGhCount`·`LANG_COLOR` |
| `GitHubFinderApp` | 폼·**최근 검색 칩** 이벤트, 검색 흐름(`#runSearch`), `AbortController`, `RecentSearchStore`와 연동 |

## 6. 프로젝트 구조

| 파일 | 설명 |
|------|------|
| `index.html` | 마크업, 상단 **SVG `<symbol>` 스프라이트**(Octicons 스타일), `#search-recent`·`#repo-item-template`, `<script src="app.js" defer>` |
| `styles.css` | GitHub 유사 **라이트/다크** 변수, 검색·**최근 검색 칩**·프로필·vcard·저장소·반응형 스타일 |
| `app.js` | `UrlSafety`, `GitHubClient`, `FinderView`, `RecentSearchStore`, `GitHubFinderApp` |
| `PLAN.md` | 개발 계획(범위·Must/Nice) |
| `AGENTS.md` | 작업 이력 한 줄 요약 |
| `docs/prompt-log.md` | 프롬프트·의도/반영 로그 |
| `docs/ui-troubleshooting.md` | UI 개편·증상별 안내·**2.**~**8.** 절 트러블(문제 요약 → 프롬프트 코드블록 → `> 의도/반영:`) |

## 7. 문서

- 개발 계획(기능·API·스택·범위): [PLAN.md](PLAN.md)
- 개발 시 사용한 프롬프트와 의도 정리: [docs/prompt-log.md](docs/prompt-log.md)
- **UI 개편·트러블슈팅**(아이콘, vcard, 이메일 API, 빈 필드 숨김, 타이포, 통합 상태 UI 등 — 본 문서 **2.**~**8.** 절은 [프롬프트 로그](docs/prompt-log.md)와 같은 **문제 요약 → 프롬프트 → `> 의도/반영:`** 형식): [docs/ui-troubleshooting.md](docs/ui-troubleshooting.md)

