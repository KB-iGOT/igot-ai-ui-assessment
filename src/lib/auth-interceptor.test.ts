import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOGOUT_URL,
  __resetAuthInterceptor,
  installAuthInterceptor,
} from "./auth-interceptor";

const unauthorizedBody = {
  id: "api.error",
  ver: "1.0",
  params: { status: "failed", err: "UNAUTHORIZED_ERROR", errmsg: "UNAUTHORIZED: Access is denied" },
  responseCode: "UNAUTHORIZED",
  result: {},
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("auth interceptor", () => {
  let uninstall: () => void;
  let hrefSetter: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    __resetAuthInterceptor();
    hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { set href(v: string) { hrefSetter(v); } },
    });
    localStorage.setItem("auth_user", "{}");
  });

  afterEach(() => {
    uninstall?.();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  const install = (response: Response) => {
    window.fetch = vi.fn().mockResolvedValue(response);
    uninstall = installAuthInterceptor();
  };

  it("logs out on the UNAUTHORIZED error payload", async () => {
    install(jsonResponse(unauthorizedBody, 401));
    const res = await fetch("/apis/anything");
    expect(hrefSetter).toHaveBeenCalledWith(LOGOUT_URL);
    expect(localStorage.getItem("auth_user")).toBeNull();
    // caller can still read the body
    expect((await res.json()).responseCode).toBe("UNAUTHORIZED");
  });

  it("does not log out on other errors", async () => {
    install(jsonResponse({ detail: "Invalid username or password" }, 401));
    await fetch("/api/v1/auth/login");
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(localStorage.getItem("auth_user")).toBe("{}");
  });

  it("does not log out on successful responses", async () => {
    install(jsonResponse({ responseCode: "OK" }, 200));
    await fetch("/apis/anything");
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it("redirects only once for concurrent unauthorized responses", async () => {
    window.fetch = vi.fn().mockImplementation(async () => jsonResponse(unauthorizedBody, 401));
    uninstall = installAuthInterceptor();
    await Promise.all([fetch("/a"), fetch("/b"), fetch("/c")]);
    expect(hrefSetter).toHaveBeenCalledTimes(1);
  });
});
