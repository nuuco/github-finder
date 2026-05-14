# GitHub Finder

GitHub 공개 API(비인증)로 **사용자 프로필**과 **최신 공개 저장소 10개**를 조회하는 정적 웹 페이지입니다. HTML, CSS, **단일 `app.js`**(클래스 기반)만 사용합니다.

## 기능

- GitHub **로그인과 정확히 일치**하는 사용자명으로 검색(Enter 또는 검색 버튼)
- 프로필: 이미지, 표시 이름, **@로그인(GitHub 프로필 링크)**, 소개, **GitHub에서 프로필 보기** 버튼
- **링크**: 웹사이트(`blog`), X(`twitter_username`), GitHub **팔로워/팔로잉 탭** 바로가기
- **연락**: 소속(`company`), 위치(`location`), 공개 이메일(`email`) — **비인증** `GET /users/{login}` 응답에서는 GitHub 정책상 `email`이 **대부분 `null`**이라 프로필에 이메일이 있어도 앱에는 표시되지 않는 경우가 많습니다.
- **이력**: 계정 가입 시각(`created_at`), 프로필 갱신 시각(`updated_at`)
- 통계: 팔로워·팔로잉·공개 저장소·**공개 Gist** 수
- 저장소: 설명, **다른 저장소에서 포크 여부** 표시, **주 언어**(`language`), **스타·포크 수**, **최근 푸시(또는 갱신)일**
- 최신 업데이트 순 저장소 10개, 저장소 링크는 **새 탭**(`noopener noreferrer`)
- 빈 입력, 404, 403(요청 한도), 네트워크 오류 등 **한국어 안내**
- 비인증 API 한도가 남아 있으면 응답 헤더(`X-RateLimit-Remaining` 등)를 참고해 안내 문구에 반영할 수 있는 경우 반영

## 검색 한 번에 API가 두 번 호출되는 이유

1. `GET /users/{login}` — 사용자 정보  
2. `GET /users/{login}/repos?...` — 저장소 목록  

GitHub REST API는 두 정보를 한 URL로 합쳐 주지 않습니다. 사용자가 없으면(404) 두 번째 호출은 하지 않습니다.

## 비인증 API 한도

- IP 기준으로 시간당 요청 수에 제한이 있습니다(대략 **60회/시간** 수준으로 이해하면 됩니다).  
- 상세는 GitHub 공식 문서를 참고하세요: [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

## 로컬에서 실행하는 방법

스크립트가 **`app.js` 한 파일**이므로 `index.html`을 **`file://`로 연 뒤**에도 동작하는 경우가 많습니다. 다만 브라우저·환경에 따라 `fetch`가 막힐 수 있어, 아래처럼 **정적 서버**로 여는 편이 더 안정적입니다.

```bash
cd /path/to/github-finder
npx --yes serve .
```

터미널에 표시된 `http://localhost:…` 주소로 브라우저에서 열면 됩니다.  
(`python3 -m http.server` 등 다른 정적 서버도 가능합니다.)

## 스크립트 구조 (OOP)

[`app.js`](app.js) 한 파일 안에 역할을 나눈 클래스가 있습니다.

| 클래스 | 역할 |
|--------|------|
| `UrlSafety` | 외부 URL·`mailto`·트위터 프로필 URL 검증 (정적 메서드) |
| `GitHubClient` | GitHub REST 호출·한도 헤더 해석 |
| `FinderView` | DOM 참조·프로필·저장소 렌더링 (비공개 `#` 메서드로 섹션별 갱신) |
| `GitHubFinderApp` | 폼 이벤트·검색 흐름·에러 처리·`AbortController` |

## 프로젝트 구조

| 파일 | 설명 |
|------|------|
| `index.html` | 마크업 (`<script src="app.js" defer>`) |
| `styles.css` | 스타일·반응형·전환 |
| `app.js` | API 클라이언트·뷰·앱 컨트롤러 (클래스) |

## 문서

- 개발 계획(기능·API·스택·범위): [PLAN.md](PLAN.md)
- 개발 시 사용한 프롬프트와 의도 정리: [docs/prompt-log.md](docs/prompt-log.md)

