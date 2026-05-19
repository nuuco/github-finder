/**
 * URL 검증·GitHub REST 클라이언트
 * @file
 */

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
