import type { AiTextMessage } from "./types";

export function AiBubble({ message }: { message: AiTextMessage }) {
  if (message.status === "loading") {
    return (
      <div
        className="ai-message demo-thinking"
        role="status"
        aria-live="polite"
      >
        <strong className="ai-name">{message.label ?? "Command AI"} ···</strong>
        <p className="caption muted">{message.content}</p>
        <p className="caption muted">
          Pemutaran snapshot demo, bukan proses LLM.
        </p>
      </div>
    );
  }

  if (message.status === "error") {
    return (
      <div
        className="ai-message notice error"
        role="alert"
        aria-label="Kesalahan respons AI"
      >
        <strong className="ai-name d-block mb-1">
          {message.label ?? "Command AI"}
        </strong>
        <p>{message.errorMessage ?? message.content}</p>
      </div>
    );
  }

  return (
    <div
      className="ai-message stack"
      data-testid="ai-bubble"
      role="article"
      aria-label="Tanggapan AI"
    >
      <strong className="ai-name">
        {message.label ?? "Command AI · Simulasi"}
      </strong>
      <p>{message.content}</p>
    </div>
  );
}
