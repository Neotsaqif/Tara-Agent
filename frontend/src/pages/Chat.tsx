import { useEffect, useState } from "react";
import type { Mode } from "../App";
import { Button, Icon, Modal, Notice, PageHeading } from "../components/ui";
import {
  AiBubble,
  ChatComposer,
  SelectionBubble,
  UserBubble,
} from "../components/chat";
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
            <UserBubble
              message={{
                type: "user",
                id: "fixture-prompt",
                content: fixture.prompt,
              }}
            />
            {thinking ? (
              <div className="ai-message demo-thinking" role="status">
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
                <AiBubble
                  message={{
                    type: "ai_text",
                    id: "fixture-response",
                    content: fixture.response,
                    label: "Command AI · Simulasi",
                  }}
                />
                <SelectionBubble
                  message={{
                    type: "selection",
                    id: "demo-recommendations",
                    options: recommendations.map((item) => ({
                      ...item,
                      id: item.id as "A" | "B" | "C",
                      feasible: item.id !== "C",
                      unfeasibleReason:
                        item.id === "C"
                          ? "Margin ilustrasi 55% di bawah batas aman target 60%"
                          : undefined,
                    })),
                    selectedOptionId: route.option,
                    rationaleTitle: fixture.rationaleTitle,
                    rationale: fixture.rationale,
                  }}
                  onSelectOption={(optionId) =>
                    navigate(chatHref(route.context, optionId))
                  }
                  onSimulateOption={(optionId) =>
                    navigate(simulationHref(route.context, optionId))
                  }
                  onViewRationale={(optionId) => setRationale(optionId)}
                />
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
          <UserBubble
            message={{
              type: "user",
              id: "local-draft",
              content: objective,
              isDraft: true,
            }}
          />
        )}
        {message && <Notice>{message}</Notice>}
        <ChatComposer
          onSubmitDraft={(submittedDraft) => {
            setObjective(submittedDraft);
            setMessage(
              "Draft tersedia selama halaman ini terbuka. API chat belum tersedia; tidak ada jawaban AI atau rekomendasi baru yang dibuat.",
            );
          }}
          onAddContext={() => {
            if (mode === "demo") setContextOpen(true);
            else
              setMessage(
                "Konteks outlet, periode, dan data transaksi belum dapat dilampirkan karena API konteks belum tersedia.",
              );
          }}
          contextHint={
            mode === "demo"
              ? "Semua outlet · 90 hari ilustrasi"
              : "Belum ada data konteks"
          }
        />
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
