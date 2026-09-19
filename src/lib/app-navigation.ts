export const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
export const isAndroidBrowser = () => /Android/i.test(navigator.userAgent || "");

const getAppDeepLinkUrl = (path: string, params?: Record<string, string | undefined>) => {
  const url = new URL(`mbokamaket://${path.replace(/^\/+/, "")}`);
  Object.entries(params || {}).forEach(([key, value]) => { if (value?.trim()) url.searchParams.set(key, value); });
  return url.toString();
};

export const openAppIfInstalled = (path: string, params?: Record<string, string | undefined>) => {
  if (!isMobileBrowser() || typeof window === "undefined") return false;
  const fallbackUrl = window.location.href;
  const appUrl = getAppDeepLinkUrl(path, params);
  try { const frame = document.createElement("iframe"); frame.style.display = "none"; frame.src = appUrl; document.body.appendChild(frame); window.setTimeout(() => frame.remove(), 1200); } catch { /* Keep the deep-link redirect. */ }
  const timer = window.setTimeout(() => { if (document.visibilityState === "visible") window.location.href = fallbackUrl; }, 1200);
  window.location.replace(appUrl);
  window.setTimeout(() => window.clearTimeout(timer), 1600);
  return true;
};

export const getAuthRedirectUrl = () => {
  const configuredUrl = (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined)?.trim();
  return configuredUrl || (typeof window === "undefined" ? "http://localhost:5173/" : `${window.location.origin}${window.location.pathname}`);
};

export const getPasswordResetRedirectUrl = () => {
  const baseUrl = getAuthRedirectUrl();
  try { const url = new URL(baseUrl); url.searchParams.set("reset", "1"); return url.toString(); } catch { return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}reset=1`; }
};
