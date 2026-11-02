import { useState, type FormEvent } from "react";
import { Button } from "../ui";

export function ChatComposer({ onSubmitDraft, onAddContext, contextHint = "Semua outlet · 90 hari ilustrasi", placeholder = "Tanyakan lebih lanjut atau ubah rekomendasi…", disabled = false, submitLabel = "Kirim pertanyaan ↑" }: { onSubmitDraft: (draft: string) => void | Promise<void>; onAddContext?: () => void; contextHint?: string; placeholder?: string; disabled?: boolean; submitLabel?: string }) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try { await onSubmitDraft(trimmed); setDraft(""); } finally { setSubmitting(false); }
  };
  return <form className="chat-composer" onSubmit={handleSubmit} aria-label="Formulir pesan chat">
    <label className="field"><span>Pertanyaan atau tujuan bisnis</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} maxLength={4000} disabled={disabled || submitting} rows={3} /></label>
    <div className="composer-actions d-flex align-items-center flex-wrap gap-3">
      {onAddContext && <button type="button" className="text-button caption" onClick={onAddContext} disabled={disabled || submitting}>＋ Tambah konteks</button>}
      <span className="caption muted">{contextHint}</span>
      <Button type="submit" disabled={!draft.trim() || disabled || submitting}>{submitting ? "Mengirim…" : submitLabel}</Button>
    </div>
  </form>;
}
