const API_BASE = "https://api.github.com";
const REPOS_PER_PAGE = 10;

/**
 * @param {string} login
 * @param {AbortSignal} [signal]
 */
export function buildUserUrl(login) {
  const encoded = encodeURIComponent(login);
  return `${API_BASE}/users/${encoded}`;
}

/**
 * @param {string} login
 * @param {AbortSignal} [signal]
 */
export function buildReposUrl(login) {
  const encoded = encodeURIComponent(login);
  const q = new URLSearchParams({
    sort: "updated",
    direction: "desc",
    per_page: String(REPOS_PER_PAGE),
  });
  return `${API_BASE}/users/${encoded}/repos?${q}`;
}

/**
 * @param {Headers} headers
 */
export function readRateLimitHint(headers) {
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  if (remaining == null) return null;
  const n = Number(remaining);
  if (Number.isNaN(n)) return null;
  let resetText = "";
  if (reset) {
    const sec = Number(reset);
    if (!Number.isNaN(sec)) {
      const d = new Date(sec * 1000);
      resetText = d.toLocaleString("ko-KR");
    }
  }
  return { remaining: n, resetText };
}

/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @returns {Promise<{ ok: boolean, status: number, data: unknown, headers: Headers }>}
 */
export async function githubFetchJson(url, signal) {
  let response;
  try {
    response = await fetch(url, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
      },
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
 * 사용자 조회 후 성공 시에만 저장소 목록 조회
 * @param {string} login
 * @param {AbortSignal} signal
 */
export async function fetchUserThenRepos(login, signal) {
  const userUrl = buildUserUrl(login);
  const userRes = await githubFetchJson(userUrl, signal);

  if (!userRes.ok) {
    return { user: null, repos: null, userRes, reposRes: null };
  }

  const reposUrl = buildReposUrl(login);
  const reposRes = await githubFetchJson(reposUrl, signal);

  return {
    user: userRes.data,
    repos: reposRes.ok ? reposRes.data : null,
    userRes,
    reposRes,
  };
}
