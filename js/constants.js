/**
 * 공통 상수·메시지
 * @file
 */

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="%232d3a4d" width="96" height="96"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%238b9cb3" font-size="12" font-family="system-ui,sans-serif">?</text></svg>`
  );

const MESSAGES = Object.freeze({
  emptyInput: "사용자명을 입력해 주세요.",
  notFound: "해당 사용자를 찾을 수 없습니다.",
  rateLimit: "요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
  rateLimitDetail(remaining, resetText) {
    if (resetText) {
      return `남은 요청: ${remaining}. 한도 초기화 시각(참고): ${resetText}`;
    }
    return `남은 요청: ${remaining}.`;
  },
  network: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요.",
  httpError(code) {
    return `오류가 발생했습니다. (상태 코드: ${code})`;
  },
  reposError: "저장소 목록을 가져오지 못했습니다.",
  noRepos: "표시할 공개 저장소가 없습니다.",
  idleRepos: "검색하면 최신 저장소가 표시됩니다.",
  emptyScreenGuide: "사용자명을 입력하고 검색하면 프로필과 최신 저장소가 표시됩니다.",
  labelJoined: "가입",
  labelProfileUpdated: "프로필 갱신",
  followersSuffix: "팔로워",
  followingSuffix: "팔로잉",
});

const RECENT_SEARCH_STORAGE_KEY = "github-finder-recent-logins";
const RECENT_SEARCH_MAX = 10;
