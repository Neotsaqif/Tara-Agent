import { useState } from "react";
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
import Simulation from "./Simulation";
import "./flows.css";

export default function Chat({ mode }: { mode: Mode }) {
  const [draft, setDraft] = useState("");
  const [objective, setObjective] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [approval, setApproval] = useState<string | null>(null);
  const option = recommendations.find((item) => item.id === rationale);
  if (selected && mode === "demo")
    return <Simulation optionId={selected} onBack={() => setSelected(null)} />;
  return (
    <>
      <PageHeading
        title="Mitra bisnis AI Anda"
        subtitle="Ubah pertanyaan bisnis menjadi langkah terukur."
      />
      <div className="chat-workspace">
        <div className="chat-title">
          <Icon name="IconSpark" />
          <h2>Tingkatkan penjualan sore</h2>
        </div>
        <a className="caption muted" href="#overview">
          ← Kembali ke Ringkasan ·{" "}
          {mode === "demo"
            ? "3 outlet · 90 hari penjualan ilustrasi"
            : "Konteks bisnis belum tersedia"}
        </a>
        {mode === "demo" ? (
          <>
            <p className="caption muted">HARI INI, 10.32 · DEMO</p>
            <div className="user-message">
              Promo mana yang paling efektif untuk meningkatkan penjualan sore
              tanpa terlalu menurunkan margin?
            </div>
            <div className="stack">
              <strong className="ai-name">Command AI · Simulasi</strong>
              <p>
                Pendapatan pukul 14.00–17.00 masih 18% di bawah rata-rata
                harian. Dari transaksi dan promo sebelumnya, tiga pilihan ini
                layak diuji.
              </p>
            </div>
            <div className="recommendations">
              {recommendations.map((item) => (
                <section
                  className={`recommendation ${item.id === "A" ? "recommended" : ""}`}
                  key={item.id}
                >
                  <p className="caption ai-name">Rekomendasi {item.id}</p>
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
                      onClick={() => setSelected(item.id)}
                    >
                      Simulasikan
                    </Button>
                    <Button onClick={() => setApproval(item.id)}>
                      Setujui
                    </Button>
                  </div>
                </section>
              ))}
            </div>
            <Card>
              <details open>
                <summary>
                  <strong>Mengapa A unggul ⌄</strong>
                </summary>
                <p className="muted rationale-copy">
                  Dalam 4 promo terakhir, paket menaikkan nilai pesanan 14%.
                  Margin kopi dan pastri masih memberi ruang untuk diskon
                  ringan.
                </p>
              </details>
            </Card>
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
          <div className="composer-actions">
            <button
              type="button"
              className="text-button caption"
              onClick={() =>
                setMessage(
                  "Konteks outlet, periode, dan data transaksi belum dapat dilampirkan karena API konteks belum tersedia.",
                )
              }
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
        <p className="caption muted">
          Estimasi AI pada demo bersifat ilustratif. Tidak ada approval atau
          eksekusi bisnis melalui halaman ini.
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
      {approval && (
        <Modal
          title="Persetujuan bisnis belum tersedia"
          onClose={() => setApproval(null)}
        >
          <Notice tone="warning">
            Autentikasi, pemeriksaan constraint, versi proposal, dan penyimpanan
            approval belum tersedia. Tombol ini tidak menyetujui atau
            menjalankan promo.
          </Notice>
          <p className="muted">
            Endpoint decision yang tersedia hanya sandbox transisi stateless.
            Buka Pengaturan untuk pengujian terpisah setelah API terhubung.
          </p>
          <Button
            onClick={() => {
              setSelected(approval);
              setApproval(null);
            }}
          >
            Tinjau simulasi demo
          </Button>
          <Button variant="secondary" onClick={() => setApproval(null)}>
            Batal
          </Button>
        </Modal>
      )}
    </>
  );
}
