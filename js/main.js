/**
 * 앱 진입·검색 흐름
 * @file
 * @depends constants.js, recent-search.js, format.js, api.js, view.js
 */

/** 검색 흐름·에러 처리·최근 검색 칩 */
class GitHubFinderApp {
  constructor() {
    this._api = new GitHubClient();
    this._view = new FinderView();
    /** @type {AbortController | null} */ this._abortController = null;
    /** @type {HTMLElement | null} */ this._recentWrap = null;
    /** @type {HTMLUListElement | null} */ this._recentList = null;
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

  #renderRecentChips() {
    const wrap = this._recentWrap;
    const list = this._recentList;
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
      this._view.setUsernameValue(login);
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

    const username = this._view.getTrimmedUsername();
    if (!username) {
      this._view.showSearchFieldHint(MESSAGES.emptyInput);
      this._view.focusUsernameInput();
      return;
    }

    await this.#runSearch(username);
  };

  init() {
    this._view.bind();
    this._recentWrap = document.getElementById("search-recent");
    const rl = document.getElementById("search-recent-list");
    this._recentList = rl instanceof HTMLUListElement ? rl : null;

    this._view.clearResultsToEmptyState();
    this._view.showInitialEmptyCopy();
    this._view.setStatus("idle", "");

    const form = this._view.getSearchForm();
    if (form) {
      form.addEventListener("submit", this.#onSearchSubmit);
    }

    const userInput = this._view.getUsernameInput();
    const clearBtn = this._view.getUsernameClearButton();
    if (userInput) {
      userInput.addEventListener("input", () => {
        this._view.hideSearchFieldHint();
        this._view.syncUsernameClearButton();
      });
    }
    if (clearBtn && userInput) {
      clearBtn.addEventListener("click", () => {
        this._view.setUsernameValue("");
        this._view.hideSearchFieldHint();
        this._view.focusUsernameInput();
      });
    }
    this._view.syncUsernameClearButton();

    if (this._recentWrap) this._recentWrap.addEventListener("click", this.#onRecentClick);

    if (this._recentList) {
      new RecentSearchDragScroll(this._recentList);
    }

    this.#renderRecentChips();
  }
}

new GitHubFinderApp().init();
