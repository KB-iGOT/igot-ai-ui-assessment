import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kcmFixture, okResponse } from "@/test/kcm-fixture";

// The loader caches its promise at module level, so each test gets a fresh
// copy of the module.
const freshModule = async () => {
  vi.resetModules();
  return import("./kcm-framework");
};

describe("loadKcmFramework", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => okResponse(kcmFixture));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("requests the kcmfinal_fw framework", async () => {
    const { loadKcmFramework } = await freshModule();
    await loadKcmFramework();
    expect(fetchMock).toHaveBeenCalledWith(
      "/apis/proxies/v8/framework/v1/read/kcmfinal_fw",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("offers only Behavioural and Functional, in that order", async () => {
    const { loadKcmFramework } = await freshModule();
    const fw = await loadKcmFramework();
    expect(fw.areas.map((a) => a.name)).toEqual(["Behavioural", "Functional"]);
  });

  it("sorts themes by name", async () => {
    const { loadKcmFramework } = await freshModule();
    const fw = await loadKcmFramework();
    expect(fw.areas[0].themes.map((t) => t.name)).toEqual([
      "Collaboration",
      "Communication",
      "Team Leadership",
    ]);
  });

  it("dedupes repeated theme associations", async () => {
    const { loadKcmFramework } = await freshModule();
    const fw = await loadKcmFramework();
    expect(fw.areas[1].themes.map((t) => t.name)).toEqual([
      "Budgeting",
      "Data Analytics",
    ]);
  });

  it("maps each theme to its deduped, sorted sub-themes", async () => {
    const { loadKcmFramework } = await freshModule();
    const fw = await loadKcmFramework();
    expect(fw.subThemesByTheme.theme_collab.map((t) => t.name)).toEqual([
      "Diversity & Inclusion",
      "Knowledge Sharing",
      "Relationship Management",
    ]);
    expect(fw.subThemesByTheme.theme_team).toEqual([]);
  });

  it("fetches once and shares the result across callers", async () => {
    const { loadKcmFramework } = await freshModule();
    const [a, b] = await Promise.all([loadKcmFramework(), loadKcmFramework()]);
    await loadKcmFramework();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("does not cache a failed request, so the next call retries", async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: false } as Response)
    );
    const { loadKcmFramework } = await freshModule();

    await expect(loadKcmFramework()).rejects.toThrow(
      "Failed to fetch competency framework"
    );
    const fw = await loadKcmFramework();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fw.areas).toHaveLength(2);
  });

  it("returns empty data for a malformed response", async () => {
    fetchMock.mockImplementationOnce(() => okResponse({}));
    const { loadKcmFramework } = await freshModule();
    const fw = await loadKcmFramework();
    expect(fw).toEqual({ areas: [], subThemesByTheme: {} });
  });
});

describe("sameName", () => {
  it("ignores case and surrounding whitespace", async () => {
    const { sameName } = await freshModule();
    expect(sameName(" behavioural ", "Behavioural")).toBe(true);
    expect(sameName("Budgeting", "Budget")).toBe(false);
    expect(sameName(undefined, "")).toBe(true);
  });
});
