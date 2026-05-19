/**
 * 숫자·언어 색·아이콘 헬퍼
 * @file
 */

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
