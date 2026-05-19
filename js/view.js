/**
 * 프로필·저장소 DOM 렌더링
 * @file
 */

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
    /** @type {HTMLFormElement | null} */ this._searchFormEl = null;
    /** @type {HTMLInputElement | null} */ this._usernameInputEl = null;
    /** @type {HTMLButtonElement | null} */ this._usernameClearBtn = null;
    /** @type {HTMLButtonElement | null} */ this._searchSubmitBtn = null;
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
    const form = document.getElementById("search-form");
    this._searchFormEl = form instanceof HTMLFormElement ? form : null;
    const uIn = document.getElementById("username-input");
    this._usernameInputEl = uIn instanceof HTMLInputElement ? uIn : null;
    const uClr = document.getElementById("username-clear");
    this._usernameClearBtn = uClr instanceof HTMLButtonElement ? uClr : null;
    const sub = this._searchFormEl?.querySelector('button[type="submit"]');
    this._searchSubmitBtn = sub instanceof HTMLButtonElement ? sub : null;
    const emptyHint = document.getElementById("profile-empty-hint");
    if (emptyHint) emptyHint.textContent = MESSAGES.emptyScreenGuide;
  }

  /** @returns {string} */
  getTrimmedUsername() {
    const v = this._usernameInputEl?.value;
    return typeof v === "string" ? v.trim() : "";
  }

  /**
   * @param {string} value
   */
  setUsernameValue(value) {
    if (!this._usernameInputEl) return;
    this._usernameInputEl.value = value;
    this.syncUsernameClearButton();
  }

  focusUsernameInput() {
    this._usernameInputEl?.focus();
  }

  /** @returns {HTMLInputElement | null} */
  getUsernameInput() {
    return this._usernameInputEl;
  }

  /** @returns {HTMLButtonElement | null} */
  getUsernameClearButton() {
    return this._usernameClearBtn;
  }

  /** @returns {HTMLFormElement | null} */
  getSearchForm() {
    return this._searchFormEl;
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
    this._usernameInputEl?.removeAttribute("aria-invalid");
    if (!this._searchFieldHintEl) return;
    this._searchFieldHintEl.textContent = "";
    this._searchFieldHintEl.hidden = true;
  }

  /**
   * @param {string} message
   */
  showSearchFieldHint(message) {
    this._usernameInputEl?.setAttribute("aria-invalid", "true");
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
    if (this._searchFormEl) this._searchFormEl.setAttribute("aria-busy", busy ? "true" : "false");
    if (this._usernameInputEl) this._usernameInputEl.disabled = busy;
    if (this._searchSubmitBtn) this._searchSubmitBtn.disabled = busy;
    this.syncUsernameClearButton();
  }

  syncUsernameClearButton() {
    const clearBtn = this._usernameClearBtn;
    const input = this._usernameInputEl;
    if (!clearBtn || !input) return;
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

    const tplNode = this._repoTemplateEl.content.firstElementChild;
    if (!(tplNode instanceof HTMLElement)) return;

    const frag = document.createDocumentFragment();
    for (const item of repos) {
      if (!item || typeof item !== "object") continue;
      const name = typeof item.name === "string" ? item.name : "";
      const htmlUrl = typeof item.html_url === "string" ? item.html_url : "";
      if (!name || !htmlUrl) continue;

      const li = /** @type {HTMLElement} */ (tplNode.cloneNode(true));
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
