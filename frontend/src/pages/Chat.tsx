import { useEffect, useState } from "react";
import { sendChatMessage, responseToMessage } from "../services/chat-adapter";
import { useAuth } from "../state/auth";
import LoginPanel from "../components/LoginPanel";
import type { ChatMessage } from "../components/chat/types";
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
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [liveError, setLiveError] = useState("");
  const [rationale, setRationale] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [nextContext, setNextContext] = useState<ChatContext>(route.context);
  const auth = useAuth();
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
          <>
            {auth.status !== "authenticated" ? (
              <LoginPanel onSignIn={async (email, password) => { await auth.signIn(email, password); }} />
            ) : (
              <>
                <Notice>Mode API nyata · masuk sebagai {auth.principal?.email} ({auth.principal?.roles.join(", ")}) · pertanyaan dikirim ke `/api/v1/agent/chat`. Streaming belum aktif.</Notice>
                {liveMessages.map((item) => item.type === "user" ? <UserBubble key={item.id} message={item} /> : item.type === "ai_text" ? <AiBubble key={item.id} message={item} /> : null)}
                {liveError && <Notice tone="error">{liveError}</Notice>}
              </>
            )}
          </>
        )}
        {objective && mode === "demo" && (
          <UserBubble message={{ type: "user", id: "local-draft", content: objective, isDraft: true }} />
        )}
        {message && <Notice>{message}</Notice>}
        <ChatComposer
          submitLabel={mode === "live" ? "Kirim pertanyaan ↑" : "Simpan draft ↑"}
          onSubmitDraft={async (submittedDraft) => {
            if (mode === "demo") {
              setObjective(submittedDraft);
              setMessage("Draft lokal: " + submittedDraft);
              return;
            }
            setLiveError("");
            setLiveMessages((current) => [...current, { type: "user", id: crypto.randomUUID(), content: submittedDraft }]);
            try {
              const response = await sendChatMessage({ conversation_id: conversationId, message: submittedDraft, workflow: "auto" }, { token: auth.accessToken });
              setConversationId(response.conversation_id);
              setLiveMessages((current) => [...current, responseToMessage(response)]);
            } catch (error) {
              setLiveError(error instanceof Error ? error.message : "Gagal memproses pertanyaan.");
            }
          }}
          onAddContext={() => {
            if (mode === "demo") setContextOpen(true);
            else
              setMessage("Konteks outlet/periode akan dilampirkan saat session-aware context tersedia.");
          }}
          contextHint={mode === "demo" ? "Semua outlet · 90 hari ilustrasi" : conversationId ? `Percakapan ${conversationId.slice(0, 8)}… · non-streaming` : "Belum ada percakapan aktif"}
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
            : "Live mode · Jawaban dari backend. Streaming nonaktif; approval tetap memerlukan konfirmasi backend."}
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
