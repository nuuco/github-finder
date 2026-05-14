# GitHub Finder

GitHub 공개 API(비인증)로 **사용자 프로필**과 **최신 공개 저장소 10개**를 조회하는 정적 웹 페이지입니다. HTML, CSS, JavaScript(ES 모듈)만 사용합니다.

## 기능

- GitHub **로그인과 정확히 일치**하는 사용자명으로 검색(Enter 또는 검색 버튼)
- 프로필 이미지, 이름, 소개, 팔로워·팔로잉·공개 저장소 수
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

`type="module"` 스크립트는 브라우저에서 **파일을 직접 연 `file://` 주소**로 열면 동작하지 않을 수 있습니다. 아래처럼 **같은 폴더를 잠깐 웹 서버로 띄운 뒤** 접속하세요.

```bash
cd /path/to/github-finder
npx --yes serve .
```

터미널에 표시된 `http://localhost:…` 주소로 브라우저에서 열면 됩니다.  
(`python3 -m http.server` 등 다른 정적 서버도 가능합니다.)

## 프로젝트 구조

| 파일 | 설명 |
|------|------|
| `index.html` | 마크업 |
| `styles.css` | 스타일·반응형·전환 |
| `js/api.js` | GitHub `fetch` 래퍼 |
| `js/ui.js` | DOM 갱신(텍스트는 `textContent` 중심) |
| `js/main.js` | 이벤트·검색 흐름 |

## AI 프롬프트 로그

개발 시 사용한 프롬프트와 의도 정리: [docs/prompt-log.md](docs/prompt-log.md)

## 라이선스

저장소 소유자 정책에 따릅니다.
