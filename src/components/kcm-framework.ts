/**
 * Loader for the KCM competency framework (area → theme → sub-theme).
 *
 * The framework is static for a session, so the request is made once and the
 * promise shared by every caller — opening the question editor repeatedly
 * doesn't refetch it.
 */

import { useEffect, useState } from "react";

export interface KcmTerm {
  identifier: string;
  name: string;
}

export interface KcmArea extends KcmTerm {
  themes: KcmTerm[];
}

export interface KcmFramework {
  areas: KcmArea[];
  /** Theme identifier -> its sub-themes. */
  subThemesByTheme: Record<string, KcmTerm[]>;
}

const FRAMEWORK_URL = "/apis/proxies/v8/framework/v1/read/kcmfinal_fw";

/** The areas the question editor offers, in display order. */
const EDITABLE_AREAS = ["Behavioural", "Functional"];

/**
 * Associations in the framework response repeat terms (the same theme can be
 * listed several times under one area), so dedupe by identifier and sort by
 * name for a stable chip order.
 */
const uniqueSorted = (terms: any[] = []): KcmTerm[] => {
  const seen = new Map<string, KcmTerm>();
  terms.forEach((t) => {
    if (t?.identifier && t?.name && !seen.has(t.identifier)) {
      seen.set(t.identifier, { identifier: t.identifier, name: t.name });
    }
  });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const parse = (data: any): KcmFramework => {
  const categories: any[] = data?.result?.framework?.categories ?? [];
  const byCode = (code: string) =>
    categories.find((c) => c.code === code)?.terms ?? [];

  const areas = EDITABLE_AREAS.flatMap((name) => {
    const term = byCode("competencyarea").find((t: any) => t.name === name);
    return term
      ? [{ identifier: term.identifier, name: term.name, themes: uniqueSorted(term.associations) }]
      : [];
  });

  const subThemesByTheme: Record<string, KcmTerm[]> = {};
  byCode("theme").forEach((t: any) => {
    subThemesByTheme[t.identifier] = uniqueSorted(t.associations);
  });

  return { areas, subThemesByTheme };
};

let cached: Promise<KcmFramework> | null = null;

export const loadKcmFramework = (): Promise<KcmFramework> => {
  if (!cached) {
    cached = fetch(FRAMEWORK_URL, {
      method: "GET",
      // Same headers as the framework read in ContentInputStep.
      headers: {
        accept: "application/json, text/plain, */*",
        locale: "en",
        org: "dopt",
        rootorg: "igot",
        hostpath: "cbp.igotkarmayogi.gov.in",
        wid: "fc1624a4-fc81-4b74-aec7-141f45c2f934",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch competency framework");
        return res.json();
      })
      .then(parse)
      .catch((err) => {
        // Don't cache a failure — let the next open retry.
        cached = null;
        throw err;
      });
  }
  return cached;
};

export const useKcmFramework = (enabled = true) => {
  const [framework, setFramework] = useState<KcmFramework | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setError(false);
    loadKcmFramework()
      .then((fw) => alive && setFramework(fw))
      .catch((err) => {
        console.error("Competency framework fetch error:", err);
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { framework, loading: enabled && !framework && !error, error };
};

/**
 * Comparison key for a KCM name. AI-generated mappings don't always spell
 * names exactly as the framework does ("Behavioral", "Behavioural Competency",
 * "Diversity and Inclusion"), so ignore case, spacing, punctuation, the US
 * spelling and a trailing "competency"/"competencies".
 */
const nameKey = (s?: string) =>
  (s ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/behavioral/g, "behavioural")
    .replace(/\bcompetenc(y|ies)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Loose name match; stored values are names. */
export const sameName = (a?: string, b?: string) => nameKey(a) === nameKey(b);

export interface KcmValue {
  area: string;
  theme: string;
  subTheme: string;
}

/**
 * Maps a stored KCM triple onto the framework's own terms, so each level that
 * matches carries the framework's spelling. When the area is missing or not
 * recognised, it is inferred from the theme. Levels that don't match are
 * returned unchanged. Domain is typed, not picked, so it's left alone.
 */
export const resolveKcm = (framework: KcmFramework, value: KcmValue): KcmValue => {
  if (sameName(value.area, "Domain")) return value;
  const area =
    framework.areas.find((a) => sameName(a.name, value.area)) ??
    (value.theme.trim()
      ? framework.areas.find((a) => a.themes.some((t) => sameName(t.name, value.theme)))
      : undefined);
  const theme = area?.themes.find((t) => sameName(t.name, value.theme));
  const subTheme = theme
    ? framework.subThemesByTheme[theme.identifier]?.find((s) => sameName(s.name, value.subTheme))
    : undefined;
  return {
    area: area?.name ?? value.area,
    theme: theme?.name ?? value.theme,
    subTheme: subTheme?.name ?? value.subTheme,
  };
};
