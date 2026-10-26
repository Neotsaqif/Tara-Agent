import { useEffect, useId, useState } from "react";
import type { Mode } from "../App";
import { Button, EmptyState, Modal } from "../components/ui";
import "../styles/pages/secondary.css";

const demoNotes = [
  {
    meta: "TEMUAN · DARI AI · 12 SEP 2026",
    title: "Paket sore lebih efektif dari diskon satuan",
    description:
      "Dalam 4 promo terakhir, paket menaikkan nilai pesanan rata-rata 14% dengan margin tetap di atas 60%.",
    source: "Sumber: hasil promo · Ditinjau Rainer",
  },
  {
    meta: "PREFERENSI · CATATAN PEMILIK · 10 SEP 2026",
    title: "Batasi diskon promo di bawah 20%",
    description:
      "Preferensi pemilik: utamakan paket dan poin loyalitas. Diskon di atas 20% harus ditinjau khusus.",
    source: "Sumber: preferensi pemilik · Ditambahkan Rainer",
  },
  {
    meta: "TEMUAN · DARI AI · 08 SEP 2026",
    title: "Kunjungan akhir pekan memuncak pukul 17.00–19.00",
    description:
      "Transaksi Pusat Kota naik 32% pada periode ini. Siapkan staf dan stok produk terlaris sebelum pukul 17.00.",
    source: "Sumber: hasil promo · Ditinjau Rainer",
  },
  {
    meta: "PREFERENSI · CATATAN PEMILIK · 06 SEP 2026",
    title: "Jaga margin kotor di atas 60%",
    description:
      "Gunakan target 60% saat membandingkan rekomendasi AI. Tandai pilihan dengan proyeksi di bawah batas ini.",
    source: "Sumber: preferensi pemilik · Ditambahkan Rainer",
  },
];

export default function Memory({ mode }: { mode: Mode }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof demoNotes)[number] | null>(
    null,
  );
  const searchId = useId();
  useEffect(() => setSelected(null), [mode]);
  const notes =
    mode === "demo"
      ? demoNotes.filter((note) =>
          `${note.meta} ${note.title} ${note.description} ${note.source}`
            .toLocaleLowerCase("id")
            .includes(query.trim().toLocaleLowerCase("id")),
        )
      : [];
  return (
    <div className="secondary-page memory-page">
      <h1 className="secondary-sr-only">Memori AI</h1>
      <label className="secondary-memory-search" htmlFor={searchId}>
        <span className="secondary-sr-only">Cari memori AI</span>
        <input
          id={searchId}
          type="search"
          placeholder="Cari keputusan, promo, atau preferensi bisnis…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-describedby={`${searchId}-status`}
        />
      </label>
      {mode === "live" ? (
        <EmptyState title="Memori AI belum tersedia">
          API memori belum terhubung. Belum ada keputusan, preferensi, atau
          temuan bisnis yang tersimpan. Pilih Demo Figma untuk menjelajahi
          catatan ilustrasi.
        </EmptyState>
      ) : (
        <div className="secondary-memory-timeline">
          <p className="secondary-memory-month">SEPTEMBER 2026</p>
          <p
            className="secondary-sr-only"
            id={`${searchId}-status`}
            role="status"
          >
            {notes.length} catatan demo ditemukan.
          </p>
          {notes.length ? (
            notes.map((note) => (
              <button
                className="secondary-memory-card"
                key={note.title}
                onClick={() => setSelected(note)}
              >
                <span className="secondary-memory-meta">{note.meta}</span>
                <strong>{note.title}</strong>
                <span className="secondary-memory-description">
                  {note.description}
                </span>
                <span className="secondary-memory-source">{note.source}</span>
              </button>
            ))
          ) : (
            <EmptyState title="Tidak ada catatan yang cocok">
              Coba kata kunci lain, seperti promo, margin, atau akhir pekan.
              <Button variant="secondary" onClick={() => setQuery("")}>
                Hapus pencarian
              </Button>
            </EmptyState>
          )}
        </div>
      )}
      {mode === "live" && (
        <p
          className="secondary-sr-only"
          id={`${searchId}-status`}
          role="status"
        >
          Pencarian memerlukan API memori yang belum tersedia.
        </p>
      )}
      {selected && mode === "demo" && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p className="secondary-memory-meta">{selected.meta}</p>
          <p>{selected.description}</p>
          <p className="caption muted">{selected.source}</p>
          <p className="muted">
            AI menggunakan memori ini untuk membandingkan rekomendasi dan
            menilai risiko promo.
          </p>
          <p className="caption muted">
            Catatan demo Figma, bukan memori bisnis aktual. Belum tersimpan atau
            diterapkan melalui API.
          </p>
          <a className="button primary" href="#chat?context=memory">
            Diskusikan dengan AI
          </a>
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Tutup memori
          </Button>
        </Modal>
      )}
    </div>
  );
}
