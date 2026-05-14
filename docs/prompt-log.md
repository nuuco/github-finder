# 프롬프트 로그 (GitHub Finder)

이 문서는 개발 과정에서 나온 요청을 **의미가 드러나게** 정리한 것입니다. 최신 UI·문서 구조는 [README.md](../README.md), [docs/ui-troubleshooting.md](ui-troubleshooting.md)(**1.** 전체 방향 표·**2.**~**8.** 절은 모두 **문제 요약 → 프롬프트 코드블록 → `> 의도/반영:`** 형식)와 함께 보면 됩니다.

- 프롬프트:

```
GitHub Finder 앱 개발 계획을 세워 줘.
와이어프레임 이미지처럼 검색창·프로필·통계·저장소 목록·상태 메시지가 있어야 하고,
GitHub REST API로 실제 데이터를 붙이는 게 목표야.
Must / Nice 우선순위도 나눠 줘.
```

> 의도/반영: API 연동 중심의 기능 범위와 화면 구역을 명확히 하고, 우선순위를 문서화해 이후 구현의 기준으로 삼음.

---

- 프롬프트:

```
의사결정이 필요하거나 애매한 부분은 나에게 질문해 줘.
```

> 의도/반영: 스택(Vite+React+Tailwind vs 등), 검색 트리거(Enter/버튼만), 배포(GitHub Pages), 스타일 도구를 **질문으로 확정**한 뒤 계획서에 반영.

---

- 프롬프트:

```
(추가 질문에 대한 답 전달)
ESLint는 안 할 거고, 원래 Nice-to-have로 두었던 건 전부 구현할게.
GitHub Pages 배포는 내가 나중에 할 테니까 계획에서는 빼 줘.
저장소 목록은 10개, 처음엔 빈 화면, 저장소 링크는 새 탭, UI는 한국어.
PR 이슈 번호는 없으니까 알아서 처리해 줘.
검색 한 번에 API가 두 번인 이유랑, 404/403/네트워크 에러 처리·안내 문구도 확실히 해 줘.
검색어 아이디 정확하게 일치하면 검색되게 하자. rate limit 헤더도 반영해 줘.
```

> 의도/반영: 계획서에서 ESLint 제외, Nice 범위를 필수로 격상, 배포 단계 제거, `per_page=10`·빈 초기 상태·새 탭·한국어 메시지·403 시 `X-RateLimit-Remaining` 활용 등으로 문서와 구현 범위를 좁힘.

---

- 프롬프트:

```
디바운스 자동 검색은 하지 말고,
가능하면 HTML·CSS·JS만으로 구현하고 싶어. 렌더링 전환은 자연스럽게.
```

> 의도/반영: Enter/검색 버튼만 API 호출, React/Vite/Tailwind 없이 바닐라로 구현. CSS 전환·`DocumentFragment` 등으로 갱신을 부드럽게 처리.

---

- 프롬프트:

```
프로필이랑 저장소에 더 자세한 정보를 보여 주고 싶어.
karpathy 프로필처럼 장소·링크·메일 등과, 리포의 스택(언어)·별·포크 수 같은 것도.
```

> 의도/반영: 프로필에 `company`·`location`·`blog`·`email`·`twitter_username` 등, 저장소에 `language`·스타·포크·푸시일·포크 여부 뱃지 등을 매핑. URL은 검증 후만 링크.

---

- 프롬프트:

```
링크·연락·통계도 넣어 주고, 해당 유저 GitHub 프로필로 가는 버튼도 추가해 줘.
```

> 의도/반영: **링크**(웹·X·팔로워/팔로잉 탭), **연락**(소속·위치·메일), **이력**(가입·프로필 갱신), 통계에 **공개 Gist**, **GitHub에서 프로필 보기** 버튼을 마크업·`FinderView` 쪽에 반영.

---

- 프롬프트:

```
JS는 나누지 말고 app.js 하나로 해도 될 것 같아.
OOP 개념 챙겨서 리팩터링해도 좋아.
```

> 의도/반영: `js/*.js` 삭제 후 루트 `app.js` 단일 파일로 통합. `UrlSafety`·`GitHubClient`·`FinderView`·`GitHubFinderApp` 클래스로 역할 분리, `index.html`은 `<script src="app.js" defer>`.

---

- 프롬프트:

```
프롬프트 로그는 아래 형식대로 써 줘.
실제 프롬프트는 완전 동일하지 않아도 되고, 의미 같게 다듬어서.
각 항목은 “프롬프트”는 코드블록으로, “의도/반영”은 인용구 형태로.
(불릿 + 코드블록 + 인용구 예시 참고)
```

> 의도/반영: 본 문서를 번호·절 없이 **불릿 + 프롬프트 코드블록 + `>` 인용 한 줄** 형태로 전면 개편해, 나중에 복사·읽기 쉽게 정리함.

---

- 프롬프트:

```
개발 계획(plan) 문서도 저장소에 md 파일로 남겨 주고, README에서 그 파일로 링크해 줘.
```

> 의도/반영: 루트에 [PLAN.md](../PLAN.md)를 두어 목표·스택·API·UI·에러·문서 범위를 한글로 정리하고, README **문서** 섹션과 본 로그 하단에서 상호 링크

---

- 프롬프트:

```
각 섹션 UI를 실제 GitHub 프로필 페이지처럼 깔끔한 아이콘을 쓰고,
값이 없는 필드는 아예 안 보이게 정리해 줘.
```

> 의도/반영: Primer Octicons 스타일 SVG 스프라이트(`index.html`), `ul#profile-vcard` 단일 리스트·인라인 팔로워/팔로잉·하단은 공개 저장소·Gist만, bio/언어/날짜 등 빈 값은 `hidden` 처리. `styles.css`를 GitHub 톤 변수로 전면 조정, `app.js`에 `formatGhCount`·`LANG_COLOR`·`#renderVcard` 등 반영

---

- 프롬프트:

```
#icon-repo 아이콘이 이상해 보이고, 이메일 주소는 왜 안 뜨는지 알려줘.
```

> 의도/반영: `icon-repo`를 [@primer/octicons `repo-16`](https://cdn.jsdelivr.net/npm/@primer/octicons@19.9.0/build/svg/repo-16.svg) 공식 `path`로 교체, Gist 통계는 `code-square` 아이콘으로 구분. 이메일은 비인증 `GET /users`에서 `email`이 대부분 `null`인 API 특성으로 설명하고, `UrlSafety.safeMailtoHref` 주석·README·PLAN·[ui-troubleshooting.md](ui-troubleshooting.md)에 안내

---

- 프롬프트:

```
@아이디 줄은 더 작은 글씨로, 호버 시 링크는 밑줄 말고 세련되게 바꿔 줘.
```

> 의도/반영: `.profile__login` 글씨 크기 축소, 링크 호버는 색·옅은 배경·얇은 링만 사용하고 밑줄 제거, `:focus-visible` 아웃라인 유지

---

- 프롬프트:

```
profile-vcard__value, profile-vcard__item 쪽 글씨도 더 작게 해 줘.
```

> 의도/반영: vcard 본문 `0.8125rem`·줄간격 조정, vcard 내 아이콘 `14×14px`로 축소

---

- 프롬프트:

```
UI 수정한 내용을 트러블슈팅 문서로 남기고 싶어.
```

> 의도/반영: [docs/ui-troubleshooting.md](ui-troubleshooting.md) 작성(아이콘·이메일·빈 필드·타이포·관련 파일), README **문서**에 링크, `AGENTS.md` 이력 반영

---

- 프롬프트:

```
프롬프트 로그랑 README를 최신 코드에 맞게 갱신해 줘.
```

> 의도/반영: README의 소개·기능·`FinderView` 설명·프로젝트 구조 표를 현재 마크업·vcard·통계 줄·저장소 메타·문서 파일 목록에 맞춤. 본 로그에 상단 안내 문단과 위 UI·문서 관련 프롬프트 블록 추가, 문서 링크 섹션 정비

---

- 프롬프트:

```
「GitHub 프로필 보기」 버튼은 카드 우측 상단으로 옮길지, 없앨지 고민돼.
@아이디 클릭하면 프로필로 가니까.
```

> 의도/반영: **@로그인**과 동일 목적이라 중복 제거 권장 → `profile-actions`·`#profile-github-btn` 마크업 삭제, `#renderGithubButton`·`MESSAGES.btnGithubProfile` 제거, 미사용 `icon-mark-github` 스프라이트·`.profile-github-btn` CSS·`.icon--inline` 정리. README·PLAN·본 문서·[ui-troubleshooting.md](ui-troubleshooting.md) 반영

---

## 1. 문서 링크

- [README.md](../README.md) — 기능·실행 방법·OOP·프로젝트 구조·문서 목록
- [PLAN.md](../PLAN.md) — 개발 계획
- [docs/ui-troubleshooting.md](ui-troubleshooting.md) — UI 개편·트러블슈팅
- 본 파일(`docs/prompt-log.md`) — 프롬프트·의도/반영 로그