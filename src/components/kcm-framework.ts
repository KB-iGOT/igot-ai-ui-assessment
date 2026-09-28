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

/** Case- and whitespace-insensitive name match; stored values are names. */
export const sameName = (a?: string, b?: string) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
