import { fetchUserThenRepos, readRateLimitHint } from "./api.js";
import {
  bindDom,
  clearResultsToEmptyState,
  messages,
  renderProfile,
  renderRepos,
  setSearchBusy,
  setStatus,
  showInitialEmptyCopy,
} from "./ui.js";

let abortController = null;

function getTrimmedUsername() {
  const input = document.getElementById("username-input");
  if (!(input instanceof HTMLInputElement)) return "";
  return input.value.trim();
}

/**
 * @param {Headers} headers
 */
function format403FromResponse(headers) {
  const hint = readRateLimitHint(headers);
  if (hint && (hint.remaining === 0 || hint.remaining <= 5)) {
    return `${messages.rateLimit} ${messages.rateLimitDetail(hint.remaining, hint.resetText)}`;
  }
  return messages.rateLimit;
}

async function onSearchSubmit(event) {
  event.preventDefault();

  const username = getTrimmedUsername();
  if (!username) {
    setStatus("error", messages.emptyInput);
    return;
  }

  if (abortController) abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  setSearchBusy(true);
  setStatus("loading", messages.loading);
  clearResultsToEmptyState();
  showInitialEmptyCopy();

  try {
    const result = await fetchUserThenRepos(username, signal);

    if (!result.userRes.ok) {
      if (result.userRes.status === 404) {
        setStatus("error", messages.notFound);
        clearResultsToEmptyState();
        showInitialEmptyCopy();
        return;
      }
      if (result.userRes.status === 403) {
        setStatus("error", format403FromResponse(result.userRes.headers));
        clearResultsToEmptyState();
        showInitialEmptyCopy();
        return;
      }
      setStatus("error", messages.httpError(result.userRes.status));
      clearResultsToEmptyState();
      showInitialEmptyCopy();
      return;
    }

    renderProfile(result.user);

    if (!result.reposRes) {
      setStatus("error", messages.reposError);
      renderRepos([], "searched");
      return;
    }

    if (!result.reposRes.ok) {
      if (result.reposRes.status === 403) {
        setStatus("error", format403FromResponse(result.reposRes.headers));
      } else {
        setStatus("error", messages.httpError(result.reposRes.status));
      }
      renderRepos([], "searched");
      return;
    }

    const repos = Array.isArray(result.repos) ? result.repos : [];
    renderRepos(repos, "searched");
    setStatus("success", "조회가 완료되었습니다.");
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      setStatus("idle", "");
      return;
    }
    if (err instanceof Error && err.message === "NETWORK") {
      setStatus("error", messages.network);
      clearResultsToEmptyState();
      showInitialEmptyCopy();
      return;
    }
    setStatus("error", messages.network);
    clearResultsToEmptyState();
    showInitialEmptyCopy();
  } finally {
    setSearchBusy(false);
  }
}

function init() {
  bindDom();
  clearResultsToEmptyState();
  showInitialEmptyCopy();
  setStatus("idle", "");

  const form = document.getElementById("search-form");
  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", onSearchSubmit);
  }
}

init();
