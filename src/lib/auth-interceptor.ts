// Global fetch interceptor: when any API responds with the platform's
// UNAUTHORIZED error envelope, clear the local session and log out.

export const LOGOUT_URL = "/apis/reset";

let loggingOut = false;

export const isUnauthorizedPayload = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;
  const b = body as { responseCode?: unknown; params?: { err?: unknown } };
  return b.responseCode === "UNAUTHORIZED" || b.params?.err === "UNAUTHORIZED_ERROR";
};

export const forceLogout = () => {
  if (loggingOut) return;
  loggingOut = true;
  try {
    localStorage.removeItem("auth_user");
  } catch {
    // ignore storage errors
  }
  window.location.href = LOGOUT_URL;
};

const checkResponse = async (response: Response) => {
  if (response.ok) return;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) return;
  try {
    const body = await response.clone().json();
    if (isUnauthorizedPayload(body)) forceLogout();
  } catch {
    // non-JSON or unreadable body; nothing to do
  }
};

export const installAuthInterceptor = () => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    await checkResponse(response);
    return response;
  };
  return () => {
    window.fetch = originalFetch;
  };
};

// Test-only: reset the one-shot logout guard.
export const __resetAuthInterceptor = () => {
  loggingOut = false;
};
