/**
 * 최근 검색 로컬스토리지·칩 트랙 드래그
 * @file
 */

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
    let last = performance.now();

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      el.scrollLeft += scrollVel * dt;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
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
