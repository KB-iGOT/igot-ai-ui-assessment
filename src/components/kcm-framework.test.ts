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

  it("tolerates the spelling differences AI-generated mappings use", async () => {
    const { sameName } = await freshModule();
    expect(sameName("Behavioral", "Behavioural")).toBe(true);
    expect(sameName("Behavioural Competency", "Behavioural")).toBe(true);
    expect(sameName("Functional Competencies", "Functional")).toBe(true);
    expect(sameName("Diversity and Inclusion", "Diversity & Inclusion")).toBe(true);
    expect(sameName("Data-Analytics", "Data Analytics")).toBe(true);
  });

  it("still tells different names apart", async () => {
    const { sameName } = await freshModule();
    expect(sameName("Behavioural", "Functional")).toBe(false);
    expect(sameName("Communication", "Collaboration")).toBe(false);
  });
});

describe("resolveKcm", () => {
  const framework = {
    areas: [
      {
        identifier: "area_behavioural",
        name: "Behavioural",
        themes: [
          { identifier: "theme_collab", name: "Collaboration" },
          { identifier: "theme_vig", name: "Adherence to Vigilance Guidelines" },
        ],
      },
      {
        identifier: "area_functional",
        name: "Functional",
        themes: [{ identifier: "theme_budget", name: "Budgeting" }],
      },
    ],
    subThemesByTheme: {
      theme_collab: [{ identifier: "sub_div", name: "Diversity & Inclusion" }],
      theme_vig: [{ identifier: "sub_vig", name: "Adherence to Vigilance Guidelines" }],
      theme_budget: [{ identifier: "sub_forecast", name: "Forecasting" }],
    },
  };

  it("returns an exact mapping unchanged", async () => {
    const { resolveKcm } = await freshModule();
    const value = {
      area: "Behavioural",
      theme: "Adherence to Vigilance Guidelines",
      subTheme: "Adherence to Vigilance Guidelines",
    };
    expect(resolveKcm(framework, value)).toEqual(value);
  });

  it("rewrites each matching level in the framework's spelling", async () => {
    const { resolveKcm } = await freshModule();
    expect(
      resolveKcm(framework, {
        area: "behavioral competency",
        theme: " COLLABORATION ",
        subTheme: "Diversity and Inclusion",
      })
    ).toEqual({ area: "Behavioural", theme: "Collaboration", subTheme: "Diversity & Inclusion" });
  });

  it("infers a missing or unknown area from the theme", async () => {
    const { resolveKcm } = await freshModule();
    expect(resolveKcm(framework, { area: "", theme: "Budgeting", subTheme: "Forecasting" })).toEqual({
      area: "Functional",
      theme: "Budgeting",
      subTheme: "Forecasting",
    });
    expect(
      resolveKcm(framework, { area: "Unknown", theme: "Budgeting", subTheme: "" }).area
    ).toBe("Functional");
  });

  it("leaves levels that don't match as they were", async () => {
    const { resolveKcm } = await freshModule();
    expect(
      resolveKcm(framework, { area: "Behavioural", theme: "Not A Theme", subTheme: "Nor This" })
    ).toEqual({ area: "Behavioural", theme: "Not A Theme", subTheme: "Nor This" });
  });

  it("leaves Domain mappings alone, since they're typed", async () => {
    const { resolveKcm } = await freshModule();
    const value = { area: "Domain", theme: "Budgeting", subTheme: "GST" };
    expect(resolveKcm(framework, value)).toEqual(value);
  });
});
