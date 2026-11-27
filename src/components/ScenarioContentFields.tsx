import { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { X } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

/**
 * The three inputs only a scenario assessment has, all mandatory. Shown on the
 * Content step above Key Learning Areas.
 */
interface ScenarioContentFieldsProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  domains: string[];
  onDomainsChange: (domains: string[]) => void;
  audience: string;
  onAudienceChange: (audience: string) => void;
}

const tooltipProps = {
  arrow: true,
  placement: "top" as const,
  componentsProps: {
    tooltip: {
      sx: {
        backgroundColor: "#fff",
        color: "#000",
        fontSize: "14px",
        padding: "8px 12px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
      },
    },
    arrow: { sx: { color: "#fff" } },
  },
};

const InfoTip = ({ title }: { title: string }) => (
  <Tooltip title={title} {...tooltipProps}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-info w-4 h-4 text-muted-foreground cursor-help ml-3"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
  </Tooltip>
);

const FieldHeading = ({ label, tip }: { label: string; tip: string }) => (
  <div className="flex items-center mb-3">
    <h3 className="text-sm font-medium text-foreground">
      {label}
      <span className="text-destructive">*</span>
    </h3>
    <InfoTip title={tip} />
  </div>
);

const ScenarioContentFields = ({
  topic,
  onTopicChange,
  domains,
  onDomainsChange,
  audience,
  onAudienceChange,
}: ScenarioContentFieldsProps) => {
  const [newDomain, setNewDomain] = useState("");

  // Same entry pattern as Key Learning Areas: Enter or leaving the field adds it.
  const addDomain = () => {
    const value = newDomain.trim();
    if (value && !domains.includes(value)) onDomainsChange([...domains, value]);
    setNewDomain("");
  };

  return (
    <>
      {/* Assessment Topic — a single value */}
      <div className="card-elevated p-4">
        <FieldHeading
          label="Assessment Topic"
          tip="The one topic this scenario assessment is about."
        />
        <Input
          placeholder="e.g. Stakeholder management in public projects"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          className="h-10"
        />
      </div>

      {/* Scenario Domains / Topics — several values, sent one by one */}
      <div className="card-elevated p-4">
        <FieldHeading
          label="Scenario Domains / Topics"
          tip="The domains or topics the scenarios should be set in. Add as many as needed; each is used separately."
        />
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Enter a domain or topic and press Enter..."
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            onBlur={() => newDomain.trim() && addDomain()}
            className="h-10"
          />
        </div>
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {domains.map((domain) => (
              <Badge
                key={domain}
                variant="secondary"
                className="text-xs px-2 py-1 flex items-center gap-1 bg-accent/10 text-accent border-accent/20"
              >
                {domain}
                <button
                  onClick={() => onDomainsChange(domains.filter((d) => d !== domain))}
                  aria-label={`Remove ${domain}`}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Target Audience — one string, passed to the model as written */}
      <div className="card-elevated p-4">
        <FieldHeading
          label="Target Audience"
          tip="Who the assessment is for. The whole phrase is passed to the model as written."
        />
        <Input
          placeholder="e.g. Project managers, Programme managers, Delivery managers"
          value={audience}
          onChange={(e) => onAudienceChange(e.target.value)}
          className="h-10"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Separate multiple audiences with commas.
        </p>
      </div>
    </>
  );
};

export default ScenarioContentFields;
