/**
 * GitHub Finder — 단일 스크립트 (클래스: API 클라이언트 / 뷰 / 앱 컨트롤러)
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
  idleHint: "검색하면 프로필이 표시됩니다.",
  idleRepos: "검색하면 최신 저장소가 표시됩니다.",
  emptyScreenGuide: "사용자명을 입력하고 검색하면 프로필과 최신 저장소가 표시됩니다.",
  labelJoined: "가입",
  labelProfileUpdated: "프로필 갱신",
  followersSuffix: "팔로워",
  followingSuffix: "팔로잉",
});

const RECENT_SEARCH_STORAGE_KEY = "github-finder-recent-logins";
const RECENT_SEARCH_MAX = 10;

/** 로컬스토리지 최근 검색 로그인(성공 시만 추가, 최대 10) */
class RecentSearchStore {
  /**
   * @returns {string[]}
   */
  static load() {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => /** @type {string} */ (x).trim());
    } catch {
      return [];
    }
  }

  /**
   * @param {string[]} list
   */
  static save(list) {
    try {
      localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* 사생활 보호 모드·용량 제한 등 */
    }
  }

  /**
   * @param {string} login API `user.login`
   */
  static add(login) {
    if (typeof login !== "string" || !login.trim()) return;
    const canon = login.trim();
    const lower = canon.toLowerCase();
    let list = RecentSearchStore.load().filter((x) => x.toLowerCase() !== lower);
    list.unshift(canon);
    if (list.length > RECENT_SEARCH_MAX) list = list.slice(0, RECENT_SEARCH_MAX);
    RecentSearchStore.save(list);
  }

  /**
   * @param {string} login
   */
  static remove(login) {
    const t = typeof login === "string" ? login.trim() : "";
    if (!t) return;
    const lower = t.toLowerCase();
    const list = RecentSearchStore.load().filter((x) => x.toLowerCase() !== lower);
    RecentSearchStore.save(list);
  }
}

/** 최근 검색 칩: 가로로 이 이상·대각 판정 후 드래그 확정(칩 위 가능). 포인터 캡처 없음 → 클릭 유지 */
const RECENT_DRAG_COMMIT_PX = 10;

/**
 * 최근 검색 칩 트랙: 마우스·펜으로 칩 위·사이 드래그 시 가로 이동·관성(터치는 기본 가로 스크롤).
 * `setPointerCapture` 미사용으로 칩·× 클릭이 정상 동작한다.
 */
class RecentSearchDragScroll {
  /**
   * @param {HTMLElement} el `#search-recent-list`
   */
  constructor(el) {
    this.el = el;
    /** @type {number | null} */
    this._activePointerId = null;
    this._startClientX = 0;
    this._startClientY = 0;
    this._startScrollLeft = 0;
    this._dragCommitted = false;
    this._suppressClick = false;
    /** @type {number | null} */
    this._inertiaRaf = null;
    /** @type {{ t: number; x: number }[]} */
    this._samples = [];

    /** @type {(e: PointerEvent) => void} */
    this._onWindowPointerMove = (e) => this.#handleWindowPointerMove(e);
    /** @type {(e: PointerEvent) => void} */
    this._onWindowPointerEnd = (e) => this.#handleWindowPointerEnd(e);

    el.addEventListener("pointerdown", this.#onPointerDown);
    el.addEventListener("click", this.#onClickCapture, true);
  }

  #stopInertia() {
    if (this._inertiaRaf != null) {
      cancelAnimationFrame(this._inertiaRaf);
      this._inertiaRaf = null;
    }
  }

  #attachWindowTracking() {
    window.addEventListener("pointermove", this._onWindowPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", this._onWindowPointerEnd, { capture: true });
    window.addEventListener("pointercancel", this._onWindowPointerEnd, { capture: true });
  }

  #detachWindowTracking() {
    window.removeEventListener("pointermove", this._onWindowPointerMove, { capture: true });
    window.removeEventListener("pointerup", this._onWindowPointerEnd, { capture: true });
    window.removeEventListener("pointercancel", this._onWindowPointerEnd, { capture: true });
  }

  /** @param {PointerEvent} e */
  #onPointerDown = (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    if (e.button !== 0) return;
    if (this._activePointerId != null) return;
    this.#stopInertia();
    this._activePointerId = e.pointerId;
    this._startClientX = e.clientX;
    this._startClientY = e.clientY;
    this._startScrollLeft = this.el.scrollLeft;
    this._dragCommitted = false;
    this._suppressClick = false;
    this._samples = [];
    this.#attachWindowTracking();
  };

  /** @param {PointerEvent} e */
  #handleWindowPointerMove = (e) => {
    if (e.pointerId !== this._activePointerId) return;
    const dx = e.clientX - this._startClientX;
    const dy = e.clientY - this._startClientY;
    if (!this._dragCommitted) {
      if (
        Math.abs(dx) >= RECENT_DRAG_COMMIT_PX &&
        Math.abs(dx) >= Math.abs(dy) * 0.55
      ) {
        this._dragCommitted = true;
        this.el.classList.add("search-recent__list--dragging");
        this._samples = [{ t: performance.now(), x: e.clientX }];
      } else {
        return;
      }
    }
    this.el.scrollLeft = this._startScrollLeft - dx;
    this._samples.push({ t: performance.now(), x: e.clientX });
    if (this._samples.length > 8) this._samples.shift();
    e.preventDefault();
  };

  /** @param {PointerEvent} e */
  #handleWindowPointerEnd = (e) => {
    if (e.pointerId !== this._activePointerId) return;
    this.#detachWindowTracking();
    this._activePointerId = null;
    this.el.classList.remove("search-recent__list--dragging");

    const didDrag = this._dragCommitted;
    this._dragCommitted = false;

    if (didDrag) {
      this._suppressClick = true;
    }

    let vx = 0;
    const s = this._samples;
    if (didDrag && s.length >= 2) {
      const a = s[0];
      const b = s[s.length - 1];
      const dt = b.t - a.t;
      if (dt > 1) vx = (b.x - a.x) / dt;
    }
    if (didDrag && Math.abs(vx) > 0.012) {
      this.#runInertia(vx);
    }
  };

  /**
   * @param {number} vPxPerMs 제스처 종료 시점 추정 속도(px/ms), 오른쪽으로 빠르게 움직이면 양수
   */
  #runInertia(vPxPerMs) {
    this.#stopInertia();
    let scrollVel = -vPxPerMs * 520;
    if (Math.abs(scrollVel) < 90) return;

    const el = this.el;
    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);
    let last = performance.now();

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      el.scrollLeft += scrollVel * dt;
      const max = maxScroll();
      if (el.scrollLeft < 0) el.scrollLeft = 0;
      if (el.scrollLeft > max) el.scrollLeft = max;
      if (el.scrollLeft <= 0 && scrollVel < 0) scrollVel = 0;
      if (el.scrollLeft >= max && scrollVel > 0) scrollVel = 0;
      scrollVel *= Math.pow(0.88, dt * 60);
      if (Math.abs(scrollVel) < 18) {
        this._inertiaRaf = null;
        return;
      }
      this._inertiaRaf = requestAnimationFrame(step);
    };
    this._inertiaRaf = requestAnimationFrame(step);
  }

  /** @param {Event} e */
  #onClickCapture = (e) => {
    if (!this._suppressClick) return;
    const t = e.target;
    if (!(t instanceof Node) || !this.el.contains(t)) return;
    e.preventDefault();
    e.stopPropagation();
    this._suppressClick = false;
  };
}

/** GitHub 웹과 유사한 큰 수 축약 (예: 12.5k) */
function formatGhCount(n) {
  if (!Number.isFinite(n)) return "0";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (a >= 10_000) return `${Math.round(n / 1000)}k`;
  if (a >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/** 주 언어 색상(대표적인 것만; 없으면 null) */
const LANG_COLOR = Object.freeze({
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  Cuda: "#76B900",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
  Vue: "#41b883",
});

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {string} symbolId `icon-*`
 */
function createIconUse(symbolId) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#${symbolId}`);
  svg.appendChild(use);
  return svg;
}

/** URL·이메일 검증 (XSS·잘못된 스킴 방지) */
class UrlSafety {
  /**
   * @param {string} raw
   * @returns {string|null}
   */
  static safeHttpUrl(raw) {
    if (typeof raw !== "string") return null;
    const t = raw.trim();
    if (!t) return null;
    const candidate = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch {
      return null;
    }
  }

  /**
   * 공개 프로필 이메일용. GitHub `GET /users/:login` 비인증 응답의 `email`은 대부분 null이라
   * 웹 프로필에 이메일이 보여도 여기 값이 없으면 UI에 표시할 수 없음.
   * @param {string} email
   * @returns {string|null}
   */
  static safeMailtoHref(email) {
    if (typeof email !== "string") return null;
    const t = email.trim();
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
    return `mailto:${t}`;
  }

  /**
   * @param {string} handle
   * @returns {string|null}
   */
  static twitterProfileUrl(handle) {
    if (typeof handle !== "string") return null;
    const t = handle.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,39}$/.test(t)) return null;
    return `https://twitter.com/${encodeURIComponent(t)}`;
  }
}

/** GitHub REST (비인증) 호출 */
class GitHubClient {
  static API_BASE = "https://api.github.com";
  static REPOS_PER_PAGE = 10;

  /**
   * @param {string} login
   */
  static buildUserUrl(login) {
    return `${GitHubClient.API_BASE}/users/${encodeURIComponent(login)}`;
  }

  /**
   * @param {string} login
   */
  static buildReposUrl(login) {
    const q = new URLSearchParams({
      sort: "updated",
      direction: "desc",
      per_page: String(GitHubClient.REPOS_PER_PAGE),
    });
    return `${GitHubClient.API_BASE}/users/${encodeURIComponent(login)}/repos?${q}`;
  }

  /**
   * @param {Headers} headers
   * @returns {{ remaining: number, resetText: string } | null}
   */
  static readRateLimitHint(headers) {
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");
    if (remaining == null) return null;
    const n = Number(remaining);
    if (Number.isNaN(n)) return null;
    let resetText = "";
    if (reset) {
      const sec = Number(reset);
      if (!Number.isNaN(sec)) {
        resetText = new Date(sec * 1000).toLocaleString("ko-KR");
      }
    }
    return { remaining: n, resetText };
  }

  /**
   * @param {string} url
   * @param {AbortSignal} signal
   */
  async fetchJson(url, signal) {
    let response;
    try {
      response = await fetch(url, {
        signal,
        headers: { Accept: "application/vnd.github+json" },
      });
    } catch (err) {
      const e = new Error("NETWORK");
      e.cause = err;
      throw e;
    }

    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  }

  /**
   * @param {string} login
   * @param {AbortSignal} signal
   */
  async fetchUserThenRepos(login, signal) {
    const userRes = await this.fetchJson(GitHubClient.buildUserUrl(login), signal);
    if (!userRes.ok) {
      return { user: null, repos: null, userRes, reposRes: null };
    }
    const reposRes = await this.fetchJson(GitHubClient.buildReposUrl(login), signal);
    return {
      user: userRes.data,
      repos: reposRes.ok ? reposRes.data : null,
      userRes,
      reposRes,
    };
  }
}

/** DOM 반영 전담 */
class FinderView {
  constructor() {
    /** @type {HTMLElement | null} */ this._statusEl = null;
    /** @type {HTMLImageElement | null} */ this._avatarEl = null;
    /** @type {HTMLElement | null} */ this._nameEl = null;
    /** @type {HTMLElement | null} */ this._loginEl = null;
    /** @type {HTMLElement | null} */ this._bioEl = null;
    /** @type {HTMLUListElement | null} */ this._vcardListEl = null;
    /** @type {HTMLElement | null} */ this._inlineStatsEl = null;
    /** @type {HTMLElement | null} */ this._statsRowEl = null;
    /** @type {HTMLElement | null} */ this._publicReposEl = null;
    /** @type {HTMLElement | null} */ this._publicGistsEl = null;
    /** @type {HTMLUListElement | null} */ this._repoListEl = null;
    /** @type {HTMLTemplateElement | null} */ this._repoTemplateEl = null;
    /** @type {HTMLElement | null} */ this._profilePanelEl = null;
    /** @type {HTMLElement | null} */ this._profileErrorBlockEl = null;
    /** @type {HTMLElement | null} */ this._profileErrorTitleEl = null;
    /** @type {HTMLElement | null} */ this._profileErrorDetailEl = null;
    /** @type {HTMLElement | null} */ this._searchFieldHintEl = null;
  }

  get messages() {
    return MESSAGES;
  }

  bind() {
    this._statusEl = document.getElementById("status-message");
    this._avatarEl = document.getElementById("profile-avatar");
    this._nameEl = document.getElementById("profile-name");
    this._loginEl = document.getElementById("profile-login");
    this._bioEl = document.getElementById("profile-bio");
    const vc = document.getElementById("profile-vcard");
    this._vcardListEl = vc instanceof HTMLUListElement ? vc : null;
    this._inlineStatsEl = document.getElementById("profile-inline-stats");
    this._statsRowEl = document.getElementById("stats-row");
    this._publicReposEl = document.getElementById("stat-repos");
    this._publicGistsEl = document.getElementById("stat-gists");
    this._repoListEl = document.getElementById("repo-list");
    this._repoTemplateEl = document.getElementById("repo-item-template");
    this._profilePanelEl = document.getElementById("profile-panel");
    this._profileErrorBlockEl = document.getElementById("profile-error-block");
    this._profileErrorTitleEl = document.getElementById("profile-error-title");
    this._profileErrorDetailEl = document.getElementById("profile-error-detail");
    this._searchFieldHintEl = document.getElementById("search-field-hint");
    const emptyHint = document.getElementById("profile-empty-hint");
    if (emptyHint) emptyHint.textContent = MESSAGES.emptyScreenGuide;
  }

  /**
   * 스크린리더용(시각적으로 숨김). 일반 안내는 프로필·검색 힌트에 표시한다.
   * @param {"idle"|"loading"|"error"|"success"} variant
   * @param {string} text
   */
  setStatus(variant, text) {
    if (!this._statusEl) return;
    this._statusEl.dataset.variant = variant;
    this._statusEl.textContent = text;
  }

  hideSearchFieldHint() {
    const input = document.getElementById("username-input");
    if (input instanceof HTMLInputElement) {
      input.removeAttribute("aria-invalid");
    }
    if (!this._searchFieldHintEl) return;
    this._searchFieldHintEl.textContent = "";
    this._searchFieldHintEl.hidden = true;
  }

  /**
   * @param {string} message
   */
  showSearchFieldHint(message) {
    const input = document.getElementById("username-input");
    if (input instanceof HTMLInputElement) {
      input.setAttribute("aria-invalid", "true");
    }
    if (!this._searchFieldHintEl) return;
    this._searchFieldHintEl.textContent = message;
    this._searchFieldHintEl.hidden = false;
  }

  #hideProfileError() {
    if (this._profileErrorBlockEl) this._profileErrorBlockEl.hidden = true;
    if (this._profileErrorTitleEl) {
      this._profileErrorTitleEl.textContent = "";
      delete this._profileErrorTitleEl.dataset.tone;
    }
    if (this._profileErrorDetailEl) {
      this._profileErrorDetailEl.textContent = "";
      this._profileErrorDetailEl.hidden = true;
    }
  }

  /** 프로필 패널 `data-state`는 건드리지 않고 아바타·메타·통계 행만 초기화 */
  resetProfileContentDom() {
    if (this._avatarEl) {
      this._avatarEl.src = PLACEHOLDER_AVATAR;
      this._avatarEl.alt = "";
      this._avatarEl.classList.add("profile__avatar--placeholder");
    }
    if (this._nameEl) {
      this._nameEl.textContent = "—";
      this._nameEl.classList.add("profile__placeholder");
    }
    if (this._loginEl) {
      this._loginEl.replaceChildren();
      this._loginEl.hidden = true;
      this._loginEl.classList.add("profile__placeholder");
    }
    if (this._bioEl) {
      this._bioEl.textContent = "";
      this._bioEl.hidden = true;
    }
    if (this._vcardListEl) {
      this._vcardListEl.replaceChildren();
      this._vcardListEl.hidden = true;
    }
    if (this._inlineStatsEl) {
      this._inlineStatsEl.replaceChildren();
      this._inlineStatsEl.hidden = true;
    }
    if (this._statsRowEl) this._statsRowEl.hidden = true;
    if (this._publicReposEl) {
      this._publicReposEl.textContent = "0";
    }
    if (this._publicGistsEl) {
      this._publicGistsEl.textContent = "0";
    }
  }

  setProfileLoading() {
    this.hideSearchFieldHint();
    this.#hideProfileError();
    this.resetProfileContentDom();
    if (this._profilePanelEl) {
      this._profilePanelEl.dataset.state = "loading";
      this._profilePanelEl.setAttribute("aria-busy", "true");
    }
    this.renderRepos([], "loading");
  }

  /**
   * @param {string} title
   * @param {string} [detail]
   * @param {{ subtleTitle?: boolean }} [options] `subtleTitle`: 404 등 안내형(진회색·작은 제목)
   */
  setProfileError(title, detail = "", options = {}) {
    this.hideSearchFieldHint();
    this.resetProfileContentDom();
    if (this._profilePanelEl) {
      this._profilePanelEl.dataset.state = "error";
      this._profilePanelEl.setAttribute("aria-busy", "false");
    }
    if (this._profileErrorTitleEl) {
      this._profileErrorTitleEl.textContent = title;
      if (options && options.subtleTitle) {
        this._profileErrorTitleEl.dataset.tone = "subtle";
      } else {
        delete this._profileErrorTitleEl.dataset.tone;
      }
    }
    if (this._profileErrorDetailEl) {
      const d = typeof detail === "string" ? detail.trim() : "";
      if (d) {
        this._profileErrorDetailEl.textContent = d;
        this._profileErrorDetailEl.hidden = false;
      } else {
        this._profileErrorDetailEl.textContent = "";
        this._profileErrorDetailEl.hidden = true;
      }
    }
    if (this._profileErrorBlockEl) this._profileErrorBlockEl.hidden = false;
  }

  /**
   * @param {boolean} busy
   */
  setSearchBusy(busy) {
    const form = document.getElementById("search-form");
    const input = document.getElementById("username-input");
    const button = form?.querySelector('button[type="submit"]');
    if (form) form.setAttribute("aria-busy", busy ? "true" : "false");
    if (input) input.disabled = busy;
    if (button) button.disabled = busy;
    this.syncUsernameClearButton();
  }

  syncUsernameClearButton() {
    const clearBtn = document.getElementById("username-clear");
    const input = document.getElementById("username-input");
    if (!(clearBtn instanceof HTMLButtonElement) || !(input instanceof HTMLInputElement)) return;
    clearBtn.hidden = input.value.trim() === "" || input.disabled;
  }

  clearResultsToEmptyState() {
    this.hideSearchFieldHint();
    this.#hideProfileError();
    if (this._profilePanelEl) {
      this._profilePanelEl.dataset.state = "empty";
      this._profilePanelEl.setAttribute("aria-busy", "false");
    }
    this.resetProfileContentDom();
    this.renderRepos([], "idle");
    if (this._repoListEl) this._repoListEl.dataset.state = "empty";
  }

  showInitialEmptyCopy() {
    if (
      this._repoListEl &&
      this._repoListEl.dataset.state === "empty" &&
      this._repoListEl.childElementCount === 0
    ) {
      this.renderRepos([], "idle");
    }
  }

  /**
   * @param {HTMLUListElement} list
   * @param {string} symbolId
   * @param {Node} valueNode
   */
  #appendVcardItem(list, symbolId, valueNode) {
    const li = document.createElement("li");
    li.className = "profile-vcard__item";
    li.appendChild(createIconUse(symbolId));
    const wrap = document.createElement("div");
    wrap.className = "profile-vcard__value";
    wrap.appendChild(valueNode);
    li.appendChild(wrap);
    list.appendChild(li);
  }

  /**
   * @param {Record<string, unknown>} user
   * @param {string} login
   */
  #renderInlineStats(user, login) {
    if (!this._inlineStatsEl) return;
    this._inlineStatsEl.replaceChildren();
    if (!login) {
      this._inlineStatsEl.hidden = true;
      return;
    }
    const base = `https://github.com/${encodeURIComponent(login)}`;
    const followers = Number(user.followers);
    const following = Number(user.following);
    const aF = document.createElement("a");
    aF.href = `${base}?tab=followers`;
    aF.target = "_blank";
    aF.rel = "noopener noreferrer";
    aF.textContent = `${formatGhCount(followers)} ${MESSAGES.followersSuffix}`;
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "·";
    const aG = document.createElement("a");
    aG.href = `${base}?tab=following`;
    aG.target = "_blank";
    aG.rel = "noopener noreferrer";
    aG.textContent = `${formatGhCount(following)} ${MESSAGES.followingSuffix}`;
    this._inlineStatsEl.append(aF, sep, aG);
    this._inlineStatsEl.hidden = false;
  }

  /**
   * @param {Record<string, unknown>} user
   * @param {string} login
   */
  #renderVcard(user, login) {
    if (!this._vcardListEl) return;
    this._vcardListEl.replaceChildren();

    const company =
      typeof user.company === "string" && user.company.trim() ? user.company.trim() : "";
    if (company) {
      this.#appendVcardItem(this._vcardListEl, "icon-organization", document.createTextNode(company));
    }

    const location =
      typeof user.location === "string" && user.location.trim() ? user.location.trim() : "";
    if (location) {
      this.#appendVcardItem(this._vcardListEl, "icon-location", document.createTextNode(location));
    }

    const blogRaw = typeof user.blog === "string" ? user.blog : "";
    const blogHref = UrlSafety.safeHttpUrl(blogRaw);
    if (blogHref) {
      const a = document.createElement("a");
      a.href = blogHref;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      try {
        a.textContent = new URL(blogHref).hostname.replace(/^www\./, "");
      } catch {
        a.textContent = blogRaw.trim() || "웹사이트";
      }
      this.#appendVcardItem(this._vcardListEl, "icon-link", a);
    }

    const emailRaw = typeof user.email === "string" ? user.email : "";
    const mailHref = UrlSafety.safeMailtoHref(emailRaw);
    if (mailHref) {
      const a = document.createElement("a");
      a.href = mailHref;
      a.textContent = emailRaw.trim();
      this.#appendVcardItem(this._vcardListEl, "icon-mail", a);
    }

    const tw =
      typeof user.twitter_username === "string" && user.twitter_username.trim()
        ? user.twitter_username.trim()
        : "";
    const twUrl = UrlSafety.twitterProfileUrl(tw);
    if (twUrl) {
      const a = document.createElement("a");
      a.href = twUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = `@${tw.replace(/^@/, "")}`;
      this.#appendVcardItem(this._vcardListEl, "icon-link", a);
    }

    const createdRaw = typeof user.created_at === "string" ? user.created_at : "";
    if (createdRaw) {
      const d = new Date(createdRaw);
      const text = Number.isNaN(d.getTime())
        ? ""
        : `${MESSAGES.labelJoined} ${d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}`;
      if (text) {
        this.#appendVcardItem(this._vcardListEl, "icon-calendar", document.createTextNode(text));
      }
    }

    const updatedRaw = typeof user.updated_at === "string" ? user.updated_at : "";
    if (updatedRaw) {
      const d = new Date(updatedRaw);
      const text = Number.isNaN(d.getTime())
        ? ""
        : `${MESSAGES.labelProfileUpdated} ${d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}`;
      if (text) {
        this.#appendVcardItem(this._vcardListEl, "icon-calendar", document.createTextNode(text));
      }
    }

    this._vcardListEl.hidden = this._vcardListEl.childElementCount === 0;
  }

  /**
   * @param {Record<string, unknown> | null} user
   */
  renderProfile(user) {
    if (!user || typeof user !== "object") return;

    this.#hideProfileError();
    if (this._profilePanelEl) {
      this._profilePanelEl.dataset.state = "filled";
      this._profilePanelEl.setAttribute("aria-busy", "false");
    }

    const login = typeof user.login === "string" ? user.login : "";
    const name =
      typeof user.name === "string" && user.name.trim()
        ? user.name.trim()
        : login || "—";
    const bioRaw = typeof user.bio === "string" ? user.bio.trim() : "";

    if (this._avatarEl) {
      const url = typeof user.avatar_url === "string" ? user.avatar_url : "";
      if (url) {
        this._avatarEl.src = url;
        this._avatarEl.alt = `${name} 프로필 이미지`;
        this._avatarEl.classList.remove("profile__avatar--placeholder");
      } else {
        this._avatarEl.src = PLACEHOLDER_AVATAR;
        this._avatarEl.alt = "";
        this._avatarEl.classList.add("profile__avatar--placeholder");
      }
    }

    if (this._nameEl) {
      this._nameEl.textContent = name;
      this._nameEl.classList.remove("profile__placeholder");
    }

    if (this._loginEl) {
      this._loginEl.replaceChildren();
      const profileHref = UrlSafety.safeHttpUrl(
        typeof user.html_url === "string" ? user.html_url : ""
      );
      if (login && profileHref) {
        const a = document.createElement("a");
        a.href = profileHref;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = `@${login}`;
        this._loginEl.appendChild(a);
        this._loginEl.hidden = false;
        this._loginEl.classList.remove("profile__placeholder");
      } else {
        this._loginEl.hidden = true;
        this._loginEl.classList.add("profile__placeholder");
      }
    }

    if (this._bioEl) {
      if (bioRaw) {
        this._bioEl.textContent = bioRaw;
        this._bioEl.hidden = false;
      } else {
        this._bioEl.textContent = "";
        this._bioEl.hidden = true;
      }
    }

    this.#renderInlineStats(user, login);
    this.#renderVcard(user, login);

    const pubRepos = Number(user.public_repos);
    const pubGists = Number(user.public_gists);

    if (this._publicReposEl) {
      this._publicReposEl.textContent = Number.isFinite(pubRepos) ? formatGhCount(pubRepos) : "0";
    }
    if (this._publicGistsEl) {
      this._publicGistsEl.textContent = Number.isFinite(pubGists) ? formatGhCount(pubGists) : "0";
    }
    if (this._statsRowEl) {
      this._statsRowEl.hidden = false;
    }
  }

  /**
   * @param {unknown} repos
   * @param {"idle"|"searched"|"loading"|"reposError"} listContext
   * @param {string} [reposErrorText] listContext가 reposError일 때 표시 문구
   */
  renderRepos(repos, listContext = "idle", reposErrorText) {
    if (!this._repoListEl || !this._repoTemplateEl) return;

    this._repoListEl.replaceChildren();

    if (listContext === "loading") {
      this._repoListEl.dataset.state = "loading";
      return;
    }

    if (!Array.isArray(repos) || repos.length === 0) {
      const hint = document.createElement("li");
      if (listContext === "reposError") {
        hint.className = "repos__placeholder repos__placeholder--error";
        hint.textContent =
          typeof reposErrorText === "string" && reposErrorText.trim()
            ? reposErrorText.trim()
            : MESSAGES.reposError;
      } else {
        hint.className = "repos__placeholder";
        hint.textContent =
          listContext === "searched" ? MESSAGES.noRepos : MESSAGES.idleRepos;
      }
      this._repoListEl.appendChild(hint);
      this._repoListEl.dataset.state = "empty";
      return;
    }

    this._repoListEl.dataset.state = "filled";

    const frag = document.createDocumentFragment();
    for (const item of repos) {
      if (!item || typeof item !== "object") continue;
      const name = typeof item.name === "string" ? item.name : "";
      const htmlUrl = typeof item.html_url === "string" ? item.html_url : "";
      if (!name || !htmlUrl) continue;

      const node = this._repoTemplateEl.content.firstElementChild;
      if (!(node instanceof HTMLElement)) continue;
      const li = /** @type {HTMLElement} */ (node.cloneNode(true));
      const a = li.querySelector(".repos__link");
      const desc = li.querySelector(".repos__desc");
      const forkPill = li.querySelector(".repos__fork-pill");
      const langWrap = li.querySelector(".repos__lang-wrap");
      const langEl = li.querySelector(".repos__lang");
      const langDot = li.querySelector(".repos__lang-dot");
      const starsNum = li.querySelector(".repos__stars-num");
      const forksNum = li.querySelector(".repos__forks-num");
      const pushedWrap = li.querySelector(".repos__pushed");
      const pushedTxt = li.querySelector(".repos__pushed-txt");

      if (a) {
        a.href = htmlUrl;
        a.textContent = name;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      const isFork = item.fork === true;
      if (forkPill instanceof HTMLElement) {
        forkPill.hidden = !isFork;
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

      const language =
        typeof item.language === "string" && item.language.trim()
          ? item.language.trim()
          : "";
      if (langWrap instanceof HTMLElement && langEl instanceof HTMLElement) {
        if (language) {
          langEl.textContent = language;
          langWrap.hidden = false;
          if (langDot instanceof HTMLElement) {
            const hex = LANG_COLOR[/** @type {keyof typeof LANG_COLOR} */ (language)] || null;
            langDot.style.background = hex || "var(--lang-dot)";
          }
        } else {
          langWrap.hidden = true;
        }
      }

      const stars = Number(item.stargazers_count);
      const forks = Number(item.forks_count);
      if (starsNum instanceof HTMLElement) {
        starsNum.textContent = Number.isFinite(stars) ? formatGhCount(stars) : "0";
      }
      if (forksNum instanceof HTMLElement) {
        forksNum.textContent = Number.isFinite(forks) ? formatGhCount(forks) : "0";
      }

      const pushedRaw =
        typeof item.pushed_at === "string"
          ? item.pushed_at
          : typeof item.updated_at === "string"
            ? item.updated_at
            : "";
      if (pushedWrap instanceof HTMLElement && pushedTxt instanceof HTMLElement) {
        if (pushedRaw) {
          const d = new Date(pushedRaw);
          if (Number.isNaN(d.getTime())) {
            pushedWrap.hidden = true;
          } else {
            pushedTxt.textContent = `업데이트 ${d.toLocaleDateString("ko-KR")}`;
            pushedWrap.hidden = false;
          }
        } else {
          pushedWrap.hidden = true;
        }
      }

      frag.appendChild(li);
    }
    this._repoListEl.appendChild(frag);
  }
}

/** 검색 흐름·에러 처리·최근 검색 칩 */
class GitHubFinderApp {
  constructor() {
    this._api = new GitHubClient();
    this._view = new FinderView();
    /** @type {AbortController | null} */ this._abortController = null;
  }

  /**
   * @param {Headers} headers
   */
  #format403FromResponse(headers) {
    const hint = GitHubClient.readRateLimitHint(headers);
    if (hint && (hint.remaining === 0 || hint.remaining <= 5)) {
      return `${MESSAGES.rateLimit} ${MESSAGES.rateLimitDetail(hint.remaining, hint.resetText)}`;
    }
    return MESSAGES.rateLimit;
  }

  #getTrimmedUsername() {
    const input = document.getElementById("username-input");
    if (!(input instanceof HTMLInputElement)) return "";
    return input.value.trim();
  }

  #renderRecentChips() {
    const wrap = document.getElementById("search-recent");
    const list = document.getElementById("search-recent-list");
    if (!wrap || !list) return;
    list.replaceChildren();
    const items = RecentSearchStore.load();
    for (const login of items) {
      const li = document.createElement("li");
      li.className = "search-recent__item";
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "search-recent__chip";
      chip.dataset.login = login;
      chip.textContent = `@${login}`;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "search-recent__remove";
      rm.dataset.login = login;
      rm.setAttribute("aria-label", `${login} 기록에서 삭제`);
      rm.textContent = "×";
      li.append(chip, rm);
      list.appendChild(li);
    }
    wrap.hidden = items.length === 0;
  }

  /** @param {MouseEvent} event */
  #onRecentClick = (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const removeBtn = t.closest(".search-recent__remove");
    if (removeBtn instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      const login = removeBtn.dataset.login;
      if (login) {
        RecentSearchStore.remove(login);
        this.#renderRecentChips();
      }
      return;
    }
    const chip = t.closest(".search-recent__chip");
    if (chip instanceof HTMLButtonElement && chip.dataset.login) {
      const login = chip.dataset.login;
      const input = document.getElementById("username-input");
      if (input instanceof HTMLInputElement) {
        input.value = login;
        this._view.syncUsernameClearButton();
      }
      void this.#runSearch(login);
    }
  };

  /**
   * 긴 403·한도 안내를 제목/부가로 나눈다(첫 문장 끝 기준).
   * @param {string} full
   * @returns {{ title: string, detail: string }}
   */
  #splitAlertMessage(full) {
    const t = typeof full === "string" ? full.trim() : "";
    if (!t) return { title: "", detail: "" };
    const idx = t.indexOf(". ");
    if (idx > 0 && idx < t.length - 2) {
      return { title: t.slice(0, idx + 1).trim(), detail: t.slice(idx + 2).trim() };
    }
    return { title: t, detail: "" };
  }

  /**
   * @param {string} username 비어 있지 않은 trim된 로그인
   */
  async #runSearch(username) {
    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this._view.setSearchBusy(true);
    this._view.setProfileLoading();

    try {
      const result = await this._api.fetchUserThenRepos(username, signal);

      if (!result.userRes.ok) {
        if (result.userRes.status === 404) {
          this._view.setProfileError(MESSAGES.notFound, "", { subtleTitle: true });
          this._view.renderRepos([], "idle");
          return;
        }
        if (result.userRes.status === 403) {
          const full = this.#format403FromResponse(result.userRes.headers);
          const { title, detail } = this.#splitAlertMessage(full);
          this._view.setProfileError(title, detail);
          this._view.renderRepos([], "idle");
          return;
        }
        this._view.setProfileError(MESSAGES.httpError(result.userRes.status));
        this._view.renderRepos([], "idle");
        return;
      }

      if (!result.user || typeof result.user !== "object") {
        this._view.setProfileError(MESSAGES.reposError);
        this._view.renderRepos([], "idle");
        return;
      }

      this._view.renderProfile(/** @type {Record<string, unknown>} */ (result.user));

      if (!result.reposRes) {
        this._view.renderRepos([], "reposError", MESSAGES.reposError);
        return;
      }

      if (!result.reposRes.ok) {
        if (result.reposRes.status === 403) {
          const full = this.#format403FromResponse(result.reposRes.headers);
          const { title, detail } = this.#splitAlertMessage(full);
          this._view.renderRepos([], "reposError", detail ? `${title} ${detail}` : title);
        } else {
          this._view.renderRepos([], "reposError", MESSAGES.httpError(result.reposRes.status));
        }
        return;
      }

      const repos = Array.isArray(result.repos) ? result.repos : [];
      this._view.renderRepos(repos, "searched");

      const apiLogin =
        typeof result.user.login === "string" && result.user.login.trim()
          ? result.user.login.trim()
          : username;
      RecentSearchStore.add(apiLogin);
      this.#renderRecentChips();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        this._view.clearResultsToEmptyState();
        this._view.showInitialEmptyCopy();
        return;
      }
      if (err instanceof Error && err.message === "NETWORK") {
        this._view.setProfileError(MESSAGES.network);
        this._view.renderRepos([], "idle");
        return;
      }
      this._view.setProfileError(MESSAGES.network);
      this._view.renderRepos([], "idle");
    } finally {
      this._view.setSearchBusy(false);
    }
  }

  /** @param {SubmitEvent} event */
  #onSearchSubmit = async (event) => {
    event.preventDefault();

    const username = this.#getTrimmedUsername();
    if (!username) {
      const input = document.getElementById("username-input");
      this._view.showSearchFieldHint(MESSAGES.emptyInput);
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    await this.#runSearch(username);
  };

  init() {
    this._view.bind();
    this._view.clearResultsToEmptyState();
    this._view.showInitialEmptyCopy();
    this._view.setStatus("idle", "");

    const form = document.getElementById("search-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", this.#onSearchSubmit);
    }

    const userInput = document.getElementById("username-input");
    const clearBtn = document.getElementById("username-clear");
    if (userInput instanceof HTMLInputElement) {
      userInput.addEventListener("input", () => {
        this._view.hideSearchFieldHint();
        this._view.syncUsernameClearButton();
      });
    }
    if (clearBtn instanceof HTMLButtonElement && userInput instanceof HTMLInputElement) {
      clearBtn.addEventListener("click", () => {
        userInput.value = "";
        this._view.hideSearchFieldHint();
        this._view.syncUsernameClearButton();
        userInput.focus();
      });
    }
    this._view.syncUsernameClearButton();

    const recent = document.getElementById("search-recent");
    if (recent) recent.addEventListener("click", this.#onRecentClick);

    const recentList = document.getElementById("search-recent-list");
    if (recentList instanceof HTMLElement) {
      new RecentSearchDragScroll(recentList);
    }

    this.#renderRecentChips();
  }
}

new GitHubFinderApp().init();
