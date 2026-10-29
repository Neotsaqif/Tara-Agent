import { useState } from "react";
import { Button } from "../ui";
import { Chevron } from "../Chevron";
import type { SelectionMessage } from "./types";

export function SelectionBubble({
  message,
  onSelectOption,
  onSimulateOption,
  onViewRationale,
}: {
  message: SelectionMessage;
  onSelectOption?: (optionId: "A" | "B" | "C") => void;
  onSimulateOption?: (optionId: "A" | "B" | "C") => void;
  onViewRationale?: (optionId: "A" | "B" | "C") => void;
}) {
  const [expandedRationale, setExpandedRationale] = useState<string | null>(
    null,
  );

  const toggleRationale = (id: string) => {
    setExpandedRationale(expandedRationale === id ? null : id);
  };

  return (
    <div
      className="selection-bubble"
      data-testid="selection-bubble"
      role="region"
      aria-label="Pilihan rekomendasi strategi"
    >
      <div className="recommendations">
        {message.options.map((item) => {
          const isSelected = message.selectedOptionId === item.id;
          const isRecommended = item.id === "A";
          const isWarning = item.id === "C";
          const isExpanded = expandedRationale === item.id;

          return (
            <section
              key={item.id}
              aria-label={`Rekomendasi ${item.id}`}
              className={`recommendation ${isRecommended ? "recommended" : ""} ${isSelected ? "selected" : ""}`}
            >
              <p className="caption ai-name">
                Rekomendasi {item.id}
                {isSelected ? " ✓" : ""}
              </p>
              <h2>{item.title}</h2>
              <p className="muted recommendation-description">
                {item.description}
              </p>
              <strong className="recommendation-impact">{item.impact}</strong>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span
                  className={`caption ${isWarning ? "warning" : "success"}`}
                >
                  {item.risk}
                </span>
                <span className="caption muted">Margin: {item.margin}</span>
              </div>

              {/* Expandable rationale button/details */}
              <div className="rationale-toggle-area">
                <button
                  type="button"
                  className="text-button caption disclosure-toggle"
                  onClick={() => {
                    toggleRationale(item.id);
                    onViewRationale?.(item.id);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`rationale-content-${item.id}`}
                >
                  <span>{isExpanded ? "Tutup alasan" : "Lihat alasan"}</span>
                  <Chevron />
                </button>
                {isExpanded && (
                  <div
                    id={`rationale-content-${item.id}`}
                    className="caption muted p-2 mt-2 rationale-surface rounded"
                    role="region"
                    aria-label={`Alasan rekomendasi ${item.id}`}
                  >
                    <p>{item.rationale}</p>
                    {item.unfeasibleReason && (
                      <p className="warning mt-1 font-monospace">
                        Catatan kendala: {item.unfeasibleReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="actions mt-auto">
                <Button
                  variant="secondary"
                  onClick={() => onSimulateOption?.(item.id)}
                >
                  Simulasikan
                  {isSelected ? ` ${item.id}` : ""}
                </Button>
                <Button
                  disabled={isSelected}
                  onClick={() => onSelectOption?.(item.id)}
                >
                  {isSelected ? "Dipilih ✓" : "Setujui"}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {message.rationaleTitle && message.rationale && (
        <div className="card mt-3">
          <details open>
            <summary className="disclosure-toggle">
              <strong>{message.rationaleTitle}</strong>
              <Chevron />
            </summary>
            <p className="muted rationale-copy mt-2">{message.rationale}</p>
          </details>
        </div>
      )}
    </div>
  );
}
