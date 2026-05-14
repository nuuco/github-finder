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
  loading: "불러오는 중…",
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
  labelJoined: "가입",
  labelProfileUpdated: "프로필 갱신",
  btnGithubProfile: "GitHub에서 프로필 보기",
  followersSuffix: "팔로워",
  followingSuffix: "팔로잉",
});

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
    /** @type {HTMLElement | null} */ this._profileActionsEl = null;
    /** @type {HTMLAnchorElement | null} */ this._githubBtnEl = null;
    /** @type {HTMLUListElement | null} */ this._vcardListEl = null;
    /** @type {HTMLElement | null} */ this._inlineStatsEl = null;
    /** @type {HTMLElement | null} */ this._statsRowEl = null;
    /** @type {HTMLElement | null} */ this._publicReposEl = null;
    /** @type {HTMLElement | null} */ this._publicGistsEl = null;
    /** @type {HTMLUListElement | null} */ this._repoListEl = null;
    /** @type {HTMLTemplateElement | null} */ this._repoTemplateEl = null;
    /** @type {HTMLElement | null} */ this._profilePanelEl = null;
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
    this._profileActionsEl = document.getElementById("profile-actions");
    const gh = document.getElementById("profile-github-btn");
    this._githubBtnEl = gh instanceof HTMLAnchorElement ? gh : null;
    const vc = document.getElementById("profile-vcard");
    this._vcardListEl = vc instanceof HTMLUListElement ? vc : null;
    this._inlineStatsEl = document.getElementById("profile-inline-stats");
    this._statsRowEl = document.getElementById("stats-row");
    this._publicReposEl = document.getElementById("stat-repos");
    this._publicGistsEl = document.getElementById("stat-gists");
    this._repoListEl = document.getElementById("repo-list");
    this._repoTemplateEl = document.getElementById("repo-item-template");
    this._profilePanelEl = document.getElementById("profile-panel");
  }

  /**
   * @param {"idle"|"loading"|"error"|"success"} variant
   * @param {string} text
   */
  setStatus(variant, text) {
    if (!this._statusEl) return;
    this._statusEl.dataset.variant = variant;
    this._statusEl.textContent = text;
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
  }

  clearResultsToEmptyState() {
    if (this._profilePanelEl) this._profilePanelEl.dataset.state = "empty";
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
    if (this._githubBtnEl) {
      this._githubBtnEl.removeAttribute("href");
      this._githubBtnEl.hidden = true;
    }
    if (this._profileActionsEl) this._profileActionsEl.hidden = true;
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
   */
  #renderGithubButton(user) {
    if (!this._githubBtnEl || !this._profileActionsEl) return;
    const href = UrlSafety.safeHttpUrl(
      typeof user.html_url === "string" ? user.html_url : ""
    );
    if (href) {
      this._githubBtnEl.href = href;
      const span = this._githubBtnEl.querySelector("span");
      if (span) span.textContent = MESSAGES.btnGithubProfile;
      this._githubBtnEl.hidden = false;
      this._profileActionsEl.hidden = false;
    } else {
      this._githubBtnEl.removeAttribute("href");
      this._githubBtnEl.hidden = true;
      this._profileActionsEl.hidden = true;
    }
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

    if (this._profilePanelEl) this._profilePanelEl.dataset.state = "filled";

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

    this.#renderGithubButton(user);
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
   * @param {"idle"|"searched"} listContext
   */
  renderRepos(repos, listContext = "idle") {
    if (!this._repoListEl || !this._repoTemplateEl) return;

    this._repoListEl.replaceChildren();

    if (!Array.isArray(repos) || repos.length === 0) {
      const hint = document.createElement("li");
      hint.className = "repos__placeholder";
      hint.textContent =
        listContext === "searched" ? MESSAGES.noRepos : MESSAGES.idleRepos;
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

/** 검색 흐름·에러 처리 */
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

  /** @param {SubmitEvent} event */
  #onSearchSubmit = async (event) => {
    event.preventDefault();

    const username = this.#getTrimmedUsername();
    if (!username) {
      this._view.setStatus("error", MESSAGES.emptyInput);
      return;
    }

    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this._view.setSearchBusy(true);
    this._view.setStatus("loading", MESSAGES.loading);
    this._view.clearResultsToEmptyState();
    this._view.showInitialEmptyCopy();

    try {
      const result = await this._api.fetchUserThenRepos(username, signal);

      if (!result.userRes.ok) {
        if (result.userRes.status === 404) {
          this._view.setStatus("error", MESSAGES.notFound);
          this._view.clearResultsToEmptyState();
          this._view.showInitialEmptyCopy();
          return;
        }
        if (result.userRes.status === 403) {
          this._view.setStatus("error", this.#format403FromResponse(result.userRes.headers));
          this._view.clearResultsToEmptyState();
          this._view.showInitialEmptyCopy();
          return;
        }
        this._view.setStatus("error", MESSAGES.httpError(result.userRes.status));
        this._view.clearResultsToEmptyState();
        this._view.showInitialEmptyCopy();
        return;
      }

      if (!result.user || typeof result.user !== "object") {
        this._view.setStatus("error", MESSAGES.reposError);
        this._view.renderRepos([], "searched");
        return;
      }

      this._view.renderProfile(/** @type {Record<string, unknown>} */ (result.user));

      if (!result.reposRes) {
        this._view.setStatus("error", MESSAGES.reposError);
        this._view.renderRepos([], "searched");
        return;
      }

      if (!result.reposRes.ok) {
        if (result.reposRes.status === 403) {
          this._view.setStatus("error", this.#format403FromResponse(result.reposRes.headers));
        } else {
          this._view.setStatus("error", MESSAGES.httpError(result.reposRes.status));
        }
        this._view.renderRepos([], "searched");
        return;
      }

      const repos = Array.isArray(result.repos) ? result.repos : [];
      this._view.renderRepos(repos, "searched");
      this._view.setStatus("success", "조회가 완료되었습니다.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        this._view.setStatus("idle", "");
        return;
      }
      if (err instanceof Error && err.message === "NETWORK") {
        this._view.setStatus("error", MESSAGES.network);
        this._view.clearResultsToEmptyState();
        this._view.showInitialEmptyCopy();
        return;
      }
      this._view.setStatus("error", MESSAGES.network);
      this._view.clearResultsToEmptyState();
      this._view.showInitialEmptyCopy();
    } finally {
      this._view.setSearchBusy(false);
    }
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
  }
}

new GitHubFinderApp().init();
