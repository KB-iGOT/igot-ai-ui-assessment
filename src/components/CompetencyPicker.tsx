import { useMemo, useState } from "react";
import { Loader2, RotateCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { resolveKcm, sameName, useKcmFramework, type KcmTerm } from "./kcm-framework";

/** Domain isn't picked from the framework — its theme and sub-theme are typed. */
const DOMAIN = "Domain";

export interface CompetencyValue {
  area: string;
  theme: string;
  subTheme: string;
}

interface CompetencyPickerProps {
  value: CompetencyValue;
  onChange: (value: CompetencyValue) => void;
}

/** Search box + reset button + selectable chips, one level of the triple. */
const ChipLevel = ({
  label,
  terms,
  selected,
  onSelect,
  onReset,
  emptyText,
}: {
  label: string;
  terms: KcmTerm[];
  selected: string;
  onSelect: (name: string) => void;
  onReset: () => void;
  emptyText: string;
}) => {
  const [search, setSearch] = useState("");
  const visible = useMemo(
    () => terms.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase())),
    [terms, search]
  );

  return (
    <div>
      <div className="text-sm font-medium text-foreground mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            disabled={terms.length === 0}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onReset();
          }}
          title={`Reset ${label.toLowerCase()}`}
          aria-label={`Reset ${label.toLowerCase()}`}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 max-h-40 overflow-y-auto">
        {terms.length === 0 ? (
          <span className="text-xs text-muted-foreground">{emptyText}</span>
        ) : visible.length === 0 ? (
          <span className="text-xs text-muted-foreground">No matches.</span>
        ) : (
          visible.map((t) => {
            const isSelected = sameName(t.name, selected);
            return (
              <button
                key={t.identifier}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(t.name)}
                className={cn(
                  "px-3 py-1 rounded-full border text-xs transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-transparent bg-muted text-foreground hover:border-primary/40"
                )}
              >
                {t.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * KCM competency mapping for a single question: one area (Behavioural or
 * Functional), one theme within it, one sub-theme within that theme. Changing
 * a level clears the levels below it, since they no longer belong to it.
 */
const CompetencyPicker = ({ value: stored, onChange }: CompetencyPickerProps) => {
  const { framework, loading, error } = useKcmFramework();

  // Show the stored mapping in the framework's own terms. It's only written
  // back when the reviewer changes something, so opening the editor alone
  // doesn't count as a KCM edit.
  const value = framework ? resolveKcm(framework, stored) : stored;

  const isDomain = sameName(value.area, DOMAIN);
  const area = framework?.areas.find((a) => sameName(a.name, value.area));
  const theme = area?.themes.find((t) => sameName(t.name, value.theme));
  const subThemes = theme ? framework?.subThemesByTheme[theme.identifier] ?? [] : [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading competencies…
      </div>
    );
  }

  if (error || !framework) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load the competency framework. Close and reopen the editor to retry.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-foreground mb-2">Competency Area</div>
        <div role="radiogroup" aria-label="Competency area" className="flex flex-wrap gap-3">
          {[...framework.areas, { identifier: "domain", name: DOMAIN }].map((a) => {
            const isSelected = sameName(a.name, value.area);
            return (
              <button
                key={a.identifier}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  !isSelected && onChange({ area: a.name, theme: "", subTheme: "" })
                }
                className={cn(
                  "flex items-center gap-2.5 min-w-[160px] px-4 py-2.5 rounded-full border text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-foreground hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSelected ? "border-primary" : "border-muted-foreground"
                  )}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                {a.name}
              </button>
            );
          })}
        </div>
      </div>

      {isDomain ? (
        <>
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Competency Theme</div>
            <Input
              value={value.theme}
              onChange={(e) => onChange({ ...value, theme: e.target.value })}
              className="text-sm"
              placeholder="e.g. Data Management"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Competency Sub theme</div>
            <Input
              value={value.subTheme}
              onChange={(e) => onChange({ ...value, subTheme: e.target.value })}
              className="text-sm"
              placeholder="e.g. Data Governance"
            />
          </div>
        </>
      ) : (
      <>
      <ChipLevel
        // Remount on area change so a stale search doesn't carry over.
        key={`theme-${area?.identifier ?? "none"}`}
        label="Competency Theme"
        terms={area?.themes ?? []}
        selected={value.theme}
        onSelect={(name) =>
          !sameName(name, value.theme) &&
          onChange({ ...value, theme: name, subTheme: "" })
        }
        onReset={() => onChange({ ...value, theme: "", subTheme: "" })}
        emptyText="Select a competency area to see its themes."
      />

      <ChipLevel
        key={`sub-${theme?.identifier ?? "none"}`}
        label="Competency Sub theme"
        terms={subThemes}
        selected={value.subTheme}
        onSelect={(name) => onChange({ ...value, subTheme: name })}
        onReset={() => onChange({ ...value, subTheme: "" })}
        emptyText={
          theme ? "This theme has no sub-themes." : "Select a theme to see its sub-themes."
        }
      />
      </>
      )}
    </div>
  );
};

export default CompetencyPicker;
