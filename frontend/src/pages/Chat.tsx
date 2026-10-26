import { useEffect, useState } from "react";
import type { Mode } from "../App";
import {
  Button,
  Card,
  Icon,
  Modal,
  Notice,
  PageHeading,
} from "../components/ui";
import { recommendations } from "../data/campaigns-demo";
import {
  chatContexts,
  chatFixtures,
  chatHref,
  readChatRoute,
  simulationHref,
  type ChatContext,
} from "../data/chat-demo";
import Simulation from "./Simulation";
import "../styles/pages/flows.css";
import "../styles/pages/chat-prototype.css";

export default function Chat({ mode }: { mode: Mode }) {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const changed = () => setHash(location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  return (
    <ChatView
      key={`${mode}:${hash}`}
      mode={mode}
      hash={hash}
      navigate={(next) => {
        location.hash = next;
        setHash(next);
      }}
    />
  );
}
function ChatView({
  mode,
  hash,
  navigate,
}: {
  mode: Mode;
  hash: string;
  navigate: (hash: string) => void;
}) {
  const route = readChatRoute(hash);
  const fixture = chatFixtures[route.context];
  const [draft, setDraft] = useState("");
  const [objective, setObjective] = useState("");
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [nextContext, setNextContext] = useState<ChatContext>(route.context);
  const option = recommendations.find((item) => item.id === rationale);
  useEffect(() => {
    if (!thinking) return;
    const timer = window.setTimeout(() => setThinking(false), 900);
    return () => window.clearTimeout(timer);
  }, [thinking]);
  if (route.simulation && mode === "demo")
    return (
      <Simulation
        optionId={route.simulation}
        initialSnapshot={route.offer ?? undefined}
        onBack={() => navigate(chatHref(route.context, route.simulation))}
      />
    );
  return (
    <>
      <PageHeading
        title="Mitra bisnis AI Anda"
        subtitle="Ubah pertanyaan bisnis menjadi langkah terukur."
      />
      <div className="chat-workspace chat-prototype">
        <div className="chat-title d-flex align-items-center gap-3">
          <Icon name="ChatSpark" />
          <h2>{mode === "demo" ? fixture.title : "Pertanyaan bisnis Anda"}</h2>
        </div>
        <a className="caption muted" href="#overview">
          ← Kembali ke Ringkasan ·{" "}
          {mode === "demo"
            ? "3 outlet · 90 hari penjualan ilustrasi"
            : "Konteks bisnis belum tersedia"}
        </a>
        {mode === "demo" ? (
          <>
            <p className="chat-timestamp muted">HARI INI, 10.32 · DEMO</p>
            <div className="user-message">{fixture.prompt}</div>
            {thinking ? (
              <div className="demo-thinking" role="status">
                <strong className="ai-name">Command AI ···</strong>
                <p className="caption muted">
                  Meninjau penjualan, margin, dan promo sebelumnya…
                </p>
                <p className="caption muted">
                  Pemutaran snapshot demo, bukan proses LLM.
                </p>
                <button
                  className="text-button caption"
                  onClick={() => setThinking(false)}
                >
                  Batalkan pratinjau
                </button>
              </div>
            ) : fixture.response ? (
              <>
                <div className="stack">
                  <strong className="ai-name">Command AI · Simulasi</strong>
                  <p>{fixture.response}</p>
                </div>
                <div className="recommendations">
                  {recommendations.map((item) => (
                    <section
                      aria-label={`Rekomendasi ${item.id}`}
                      className={`recommendation ${item.id === "A" ? "recommended" : ""} ${route.option === item.id ? "selected" : ""}`}
                      key={item.id}
                    >
                      <p className="caption ai-name">
                        Rekomendasi {item.id}
                        {route.option === item.id ? " ✓" : ""}
                      </p>
                      <h2>{item.title}</h2>
                      <p className="muted recommendation-description">
                        {item.description}
                      </p>
                      <strong className="recommendation-impact">
                        {item.impact}
                      </strong>
                      <p
                        className={`caption ${item.id === "C" ? "warning" : "success"}`}
                      >
                        {item.risk}
                      </p>
                      <button
                        className="text-button caption"
                        onClick={() => setRationale(item.id)}
                      >
                        Lihat alasan ⌄
                      </button>
                      <div className="actions">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            navigate(simulationHref(route.context, item.id))
                          }
                        >
                          Simulasikan
                          {route.option === item.id ? ` ${item.id}` : ""}
                        </Button>
                        <Button
                          disabled={route.option === item.id}
                          onClick={() =>
                            navigate(chatHref(route.context, item.id))
                          }
                        >
                          {route.option === item.id ? "Dipilih ✓" : "Setujui"}
                        </Button>
                      </div>
                    </section>
                  ))}
                </div>
                <Card>
                  <details open>
                    <summary>
                      <strong>{fixture.rationaleTitle} ⌄</strong>
                    </summary>
                    <p className="muted rationale-copy">{fixture.rationale}</p>
                  </details>
                </Card>
              </>
            ) : (
              <Notice>
                Snapshot rekomendasi untuk konteks ini belum tersedia. Tidak ada
                jawaban AI atau proyeksi baru yang dibuat.
              </Notice>
            )}
          </>
        ) : (
          <Notice>
            API percakapan, diagnosis, dan rekomendasi belum tersedia.
            Pertanyaan di bawah hanya menjadi draft lokal; tidak dikirim ke LLM
            atau disimpan di server.
          </Notice>
        )}
        {objective && (
          <div className="user-message">Draft lokal: {objective}</div>
        )}
        {message && <Notice>{message}</Notice>}
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) return;
            setObjective(draft.trim());
            setDraft("");
            setMessage(
              "Draft tersedia selama halaman ini terbuka. API chat belum tersedia; tidak ada jawaban AI atau rekomendasi baru yang dibuat.",
            );
          }}
        >
          <label className="field">
            <span>Pertanyaan atau tujuan bisnis</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tanyakan lebih lanjut atau ubah rekomendasi…"
              maxLength={4000}
            />
          </label>
          <div className="composer-actions d-flex align-items-center flex-wrap gap-3">
            <button
              type="button"
              className="text-button caption"
              onClick={() => {
                if (mode === "demo") setContextOpen(true);
                else
                  setMessage(
                    "Konteks outlet, periode, dan data transaksi belum dapat dilampirkan karena API konteks belum tersedia.",
                  );
              }}
            >
              ＋ Tambah konteks
            </button>
            <span className="caption muted">
              {mode === "demo"
                ? "Semua outlet · 90 hari ilustrasi"
                : "Belum ada data konteks"}
            </span>
            <Button type="submit" disabled={!draft.trim()}>
              Simpan draft ↑
            </Button>
          </div>
        </form>
        {mode === "demo" && (
          <button
            className="text-button caption demo-replay"
            onClick={() => setThinking(true)}
            disabled={thinking}
          >
            Putar ulang respons demo
          </button>
        )}
        <p className="caption muted">
          {mode === "demo"
            ? "Demo / simulasi · Pilihan dan jadwal hanya contoh lokal. Tidak ada approval atau eksekusi bisnis melalui halaman ini."
            : "Tidak ada approval atau eksekusi bisnis melalui halaman ini."}
        </p>
      </div>
      {option && (
        <Modal
          title={`Mengapa ${option.id} ${option.id === "A" ? "unggul" : "dipertimbangkan"}`}
          onClose={() => setRationale(null)}
        >
          <p>{option.rationale}</p>
          <p className="muted">
            Demo / simulasi. Margin kopi dan pastri serta seluruh dampak di sini
            bukan hasil perhitungan bisnis aktual.
          </p>
          <Button variant="secondary" onClick={() => setRationale(null)}>
            Kembali ke chat
          </Button>
        </Modal>
      )}
      {contextOpen && (
        <Modal
          title="Tambah konteks demo"
          onClose={() => setContextOpen(false)}
        >
          <p className="muted">
            Pilih snapshot ilustrasi. Tidak ada data server yang dilampirkan.
          </p>
          <label className="field">
            <span>Konteks percakapan</span>
            <select
              value={nextContext}
              onChange={(event) =>
                setNextContext(event.target.value as ChatContext)
              }
            >
              {chatContexts.map((context) => (
                <option value={context} key={context}>
                  {chatFixtures[context].title}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <Button variant="secondary" onClick={() => setContextOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setContextOpen(false);
                navigate(chatHref(nextContext));
              }}
            >
              Buka snapshot
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
