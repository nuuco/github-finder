# UI 개편·트러블슈팅

GitHub 웹 프로필과 비슷한 톤으로 UI를 바꾼 뒤, **증상·원인·확인/대응**을 한곳에 정리한 문서입니다. 관련 코드는 주로 `index.html`, `styles.css`, `app.js`의 `FinderView`입니다.

---

## 1. 전체 방향 (무엇이 바뀌었나)

| 영역 | 내용 |
|------|------|
| 색·배경 | GitHub에 가까운 라이트/다크 변수(`--canvas-*`, `--fg-*`, `--accent-fg` 등), 카드형 패널 |
| 최근 검색 | 로컬스토리지 최대 5건·성공 시만·칩 UI(클릭 재검색·× 삭제) |
| 아이콘 | 문서 상단 SVG `<symbol>` 스프라이트(Primer Octicons 기반), `currentColor`로 테마 연동 |
| 프로필 본문 | `링크`·`연락`·`이력` 제목 블록 제거 → **`ul#profile-vcard`** 한 리스트에 아이콘 + 값 |
| 프로필 이동 | **@로그인** 링크가 `user.html_url`로 연결됨(별도 「프로필 보기」 버튼 없음·중복 제거) |
| 팔로워/팔로잉 | 이름 아래 **`profile-inline-stats`** 한 줄(탭 링크 + `k` 단위 숫자) |
| 통계 줄 | 공개 저장소·Gist만 **`#stats-row`**에 아이콘 + 숫자 |
| 저장소 카드 | repo 아이콘, 메타에 별·포크·달력 아이콘, **값 없으면 해당 줄 숨김** |

---

## 2. 아이콘이 깨지거나 이상해 보일 때

### 증상

- `#icon-repo`(저장소 아이콘) 윤곽이 어색하거나 다른 Octicon과 톤이 안 맞는다.

### 원인·조치

- 초기에는 잘못된/구버전 `path`를 쓴 적이 있음. **[@primer/octicons `repo-16`](https://cdn.jsdelivr.net/npm/@primer/octicons@19.9.0/build/svg/repo-16.svg)** 공식 `path`로 교체함.
- Gist 통계는 저장소와 구분하려 **`icon-code-square`** 스프라이트를 추가해 사용함.

### 확인

- `index.html` 안 `<symbol id="icon-repo">` … `</symbol>` 경로가 공식 SVG와 일치하는지 비교한다.

---

## 3. 이메일·연락처가 안 나올 때

### 증상

- GitHub 웹 프로필에는 이메일이 있는 것 같은데, 앱 vcard에는 메일 줄이 없다.

### 원인

- 앱은 **비인증** `GET https://api.github.com/users/{login}` 만 사용한다.
- 이 응답의 **`email` 필드는 대부분 `null`**이다. GitHub 정책·프라이버시로, 웹에 보이는 정보와 REST JSON이 항상 같지 않다.

### 확인

```bash
curl -sS "https://api.github.com/users/조회할로그인" | grep '"email"'
```

`null`이면 앱에서도 표시할 수 없다. 값이 문자열로 오면 `UrlSafety.safeMailtoHref`를 통과할 때만 `mailto:` 링크로 렌더한다.

### 조치

- “비인증으로는 한계”가 맞는지 README·본 문서로 사용자에게 안내한다.
- 토큰을 넣는 방식은 **클라이언트에 비밀 노출**이 되므로 본 프로젝트 범위 밖으로 두는 것이 일반적이다.

---

## 4. 일부 줄만 안 보일 때 (버그가 아닌 경우)

### 바이오

- `bio`가 비어 있으면 **`#profile-bio`는 `hidden`** 처리한다. “소개 없음” 문구는 넣지 않는다.

### vcard 전체

- 소속·위치·웹·메일·X·가입·갱신 중 **하나도 없으면** `ul#profile-vcard` 자체를 `hidden` 처리한다.

### 저장소 카드

| 항목 | 조건 |
|------|------|
| 설명 | `description` 비어 있으면 설명 블록 `hidden` |
| 주 언어 | `language` 없으면 언어 줄(점 + 텍스트) 전체 `hidden` |
| 업데이트일 | `pushed_at` / `updated_at` 유효 날짜 없으면 날짜 줄 `hidden` |
| 언어 색 점 | `LANG_COLOR`에 키가 있으면 해당 색, 없으면 `--lang-dot` 계열 기본색 |

---

## 5. `@로그인` 링크·vcard 글씨 크기

### `@로그인` (`#profile-login`)

- **작은 글씨**(`styles.css`의 `.profile__login`)로 이름과 위계를 나눔.
- 호버는 **밑줄 없이** 포인트 색 + 옅은 배경 + 얇은 링(`box-shadow`)만 사용.
- 키보드 포커스는 `:focus-visible`으로만 아웃라인.

### vcard (`.profile-vcard__item`, `.profile-vcard__value`)

- 본문 **`0.8125rem`(13px)** 근처로 통일, 줄간격 `1.45`.
- 아이콘은 **14×14px**로 본문에 맞춤.

---

## 6. 숫자 표기 (팔로워·스타 등)

- `app.js`의 **`formatGhCount`**: 큰 수를 `1.2k`, `12k` 형태로 축약(웹 GitHub와 비슷한 느낌).
- 통계·인라인 팔로워·저장소 메타에서 공통 사용.

---

## 7. 관련 파일 빠른 링크

| 파일 | 역할 |
|------|------|
| [`index.html`](../index.html) | 스프라이트, vcard·통계·저장소 템플릿 마크업 |
| [`styles.css`](../styles.css) | GitHub 톤 변수, 프로필·vcard·저장소·호버 스타일 |
| [`app.js`](../app.js) | `FinderView` — vcard/인라인 통계/저장소 DOM, `formatGhCount`, `LANG_COLOR` |

---

## 8. 더 보기

- [README.md](../README.md) — 기능·비인증 `email` 안내·실행 방법  
- [PLAN.md](../PLAN.md) — 원래 기능 범위  
- [docs/prompt-log.md](prompt-log.md) — 요청·의도 로그
