const PLACEHOLDER_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="%232d3a4d" width="96" height="96"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%238b9cb3" font-size="12" font-family="system-ui,sans-serif">?</text></svg>`
  );

const messages = {
  emptyInput: "사용자명을 입력해 주세요.",
  loading: "불러오는 중…",
  notFound: "해당 사용자를 찾을 수 없습니다.",
  rateLimit: "요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
  rateLimitDetail: (remaining, resetText) => {
    if (resetText) {
      return `남은 요청: ${remaining}. 한도 초기화 시각(참고): ${resetText}`;
    }
    return `남은 요청: ${remaining}.`;
  },
  network: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요.",
  httpError: (code) => `오류가 발생했습니다. (상태 코드: ${code})`,
  reposError: "저장소 목록을 가져오지 못했습니다.",
  noRepos: "표시할 공개 저장소가 없습니다.",
  idleHint: "검색하면 프로필이 표시됩니다.",
  idleRepos: "검색하면 최신 저장소가 표시됩니다.",
};

/** @type {HTMLElement | null} */
let statusEl;
/** @type {HTMLImageElement | null} */
let avatarEl;
/** @type {HTMLElement | null} */
let nameEl;
/** @type {HTMLElement | null} */
let bioEl;
/** @type {HTMLElement | null} */
let followersEl;
/** @type {HTMLElement | null} */
let followingEl;
/** @type {HTMLElement | null} */
let publicReposEl;
/** @type {HTMLUListElement | null} */
let repoListEl;
/** @type {HTMLTemplateElement | null} */
let repoTemplateEl;
/** @type {HTMLElement | null} */
let profilePanelEl;

export function bindDom() {
  statusEl = document.getElementById("status-message");
  avatarEl = document.getElementById("profile-avatar");
  nameEl = document.getElementById("profile-name");
  bioEl = document.getElementById("profile-bio");
  followersEl = document.getElementById("stat-followers");
  followingEl = document.getElementById("stat-following");
  publicReposEl = document.getElementById("stat-repos");
  repoListEl = document.getElementById("repo-list");
  repoTemplateEl = document.getElementById("repo-item-template");
  profilePanelEl = document.getElementById("profile-panel");
}

/**
 * @param {"idle"|"loading"|"error"|"success"} variant
 * @param {string} text
 */
export function setStatus(variant, text) {
  if (!statusEl) return;
  statusEl.dataset.variant = variant;
  statusEl.textContent = text;
}

/**
 * @param {boolean} busy
 */
export function setSearchBusy(busy) {
  const form = document.getElementById("search-form");
  const input = document.getElementById("username-input");
  const button = form?.querySelector('button[type="submit"]');
  if (form) form.setAttribute("aria-busy", busy ? "true" : "false");
  if (input) input.disabled = busy;
  if (button) button.disabled = busy;
}

export function clearResultsToEmptyState() {
  if (profilePanelEl) profilePanelEl.dataset.state = "empty";
  if (avatarEl) {
    avatarEl.src = PLACEHOLDER_AVATAR;
    avatarEl.alt = "";
    avatarEl.classList.add("profile__avatar--placeholder");
  }
  if (nameEl) {
    nameEl.textContent = "—";
    nameEl.classList.add("profile__placeholder");
  }
  if (bioEl) {
    bioEl.textContent = messages.idleHint;
    bioEl.classList.add("profile__placeholder");
  }
  for (const el of [followersEl, followingEl, publicReposEl]) {
    if (el) {
      el.textContent = "—";
      el.classList.add("profile__placeholder");
    }
  }
  renderRepos([], "idle");
  if (repoListEl) repoListEl.dataset.state = "empty";
}

/**
 * @param {Record<string, unknown> | null} user
 */
export function renderProfile(user) {
  if (!user || typeof user !== "object") return;

  if (profilePanelEl) profilePanelEl.dataset.state = "filled";

  const login = typeof user.login === "string" ? user.login : "";
  const name =
    typeof user.name === "string" && user.name.trim()
      ? user.name
      : login || "—";
  const bio =
    typeof user.bio === "string" && user.bio.trim()
      ? user.bio
      : "소개가 없습니다.";

  if (avatarEl) {
    const url = typeof user.avatar_url === "string" ? user.avatar_url : "";
    if (url) {
      avatarEl.src = url;
      avatarEl.alt = `${name} 프로필 이미지`;
      avatarEl.classList.remove("profile__avatar--placeholder");
    } else {
      avatarEl.src = PLACEHOLDER_AVATAR;
      avatarEl.alt = "";
      avatarEl.classList.add("profile__avatar--placeholder");
    }
  }

  if (nameEl) {
    nameEl.textContent = name;
    nameEl.classList.remove("profile__placeholder");
  }
  if (bioEl) {
    bioEl.textContent = bio;
    bioEl.classList.remove("profile__placeholder");
  }

  const followers = Number(user.followers);
  const following = Number(user.following);
  const pubRepos = Number(user.public_repos);

  if (followersEl) {
    followersEl.textContent = Number.isFinite(followers) ? String(followers) : "—";
    followersEl.classList.remove("profile__placeholder");
  }
  if (followingEl) {
    followingEl.textContent = Number.isFinite(following) ? String(following) : "—";
    followingEl.classList.remove("profile__placeholder");
  }
  if (publicReposEl) {
    publicReposEl.textContent = Number.isFinite(pubRepos) ? String(pubRepos) : "—";
    publicReposEl.classList.remove("profile__placeholder");
  }
}

/**
 * @param {unknown} repos
 * @param {"idle"|"searched"} listContext — idle: 검색 전·초기화, searched: 검색 완료 후 빈 배열
 */
export function renderRepos(repos, listContext = "idle") {
  if (!repoListEl || !repoTemplateEl) return;

  repoListEl.replaceChildren();

  if (!Array.isArray(repos) || repos.length === 0) {
    const hint = document.createElement("li");
    hint.className = "repos__placeholder";
    hint.textContent =
      listContext === "searched" ? messages.noRepos : messages.idleRepos;
    repoListEl.appendChild(hint);
    repoListEl.dataset.state = "empty";
    return;
  }

  repoListEl.dataset.state = "filled";

  const frag = document.createDocumentFragment();
  for (const item of repos) {
    if (!item || typeof item !== "object") continue;
    const name = typeof item.name === "string" ? item.name : "";
    const htmlUrl = typeof item.html_url === "string" ? item.html_url : "";
    if (!name || !htmlUrl) continue;

    const node = repoTemplateEl.content.firstElementChild;
    if (!(node instanceof HTMLElement)) continue;
    const li = /** @type {HTMLElement} */ (node.cloneNode(true));
    const a = li.querySelector("a");
    const desc = li.querySelector(".repos__desc");
    if (a) {
      a.href = htmlUrl;
      a.textContent = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    const description =
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : "";
    if (desc instanceof HTMLElement) {
      if (description) {
        desc.textContent = description;
        desc.hidden = false;
      } else {
        desc.textContent = "";
        desc.hidden = true;
      }
    }
    frag.appendChild(li);
  }
  repoListEl.appendChild(frag);
}

export function showInitialEmptyCopy() {
  if (
    repoListEl &&
    repoListEl.dataset.state === "empty" &&
    repoListEl.childElementCount === 0
  ) {
    renderRepos([], "idle");
  }
}

export { messages };
