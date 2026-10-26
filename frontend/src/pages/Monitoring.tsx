import { useEffect, useState } from "react";
import type { Mode } from "../App";
import { LineChart } from "../components/Charts";
import {
  Button,
  Card,
  EmptyState,
  Metrics,
  Modal,
  Notice,
  PageHeading,
  SelectField,
} from "../components/ui";
import { campaigns, completedCampaigns } from "../data/campaigns-demo";
import "./flows.css";

export default function Monitoring({ mode }: { mode: Mode }) {
  const [tab, setTab] = useState("Aktif");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Semua status");
  const [outlet, setOutlet] = useState("Semua Outlet");
  const [detail, setDetail] = useState(location.hash.split("/")[1] ?? "");
  const [dialog, setDialog] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setDetail(location.hash.split("/")[1] ?? "");
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const campaign = campaigns.find((item) => item.id === detail);
  if (mode === "live")
    return (
      <>
        <PageHeading
          title="Pantau setiap promo."
          subtitle="Pantau kinerja, kenali deviasi, dan tentukan langkah berikutnya."
        />
        <EmptyState title="Belum ada data aktual">
          API campaign dan pemantauan belum tersedia. Prediction, Actual, dan
          Realtime Prediction tidak dapat diverifikasi.
        </EmptyState>
      </>
    );
  if (campaign)
    return (
      <>
        <PageHeading
          title={campaign.title}
          subtitle="Pemantauan · Detail promo · Demo"
        >
          <Button onClick={() => (location.hash = "chat")}>
            Tinjau Ulang dengan AI
          </Button>
        </PageHeading>
        <a href="#monitoring" className="caption">
          ← Kembali ke Pemantauan
        </a>
        <div className="flow-toolbar">
          <span
            className={`badge ${campaign.status === "Deviasi" ? "warning" : "success"}`}
          >
            {campaign.status}
          </span>
          <p className="muted">{campaign.period} · Data ilustrasi</p>
          <Button variant="danger" onClick={() => setDialog("Hentikan Promo")}>
            Hentikan Promo
          </Button>
        </div>
        <Metrics
          items={[
            {
              label: "Pendapatan aktual",
              value: campaign.actual,
              note: "Actual ilustrasi, bukan data terukur",
            },
            {
              label: "Prediksi pendapatan",
              value: campaign.prediction,
              note: "Prediction ilustrasi",
            },
            {
              label: "Deviasi",
              value: campaign.deviation,
              note: "Perbandingan ilustrasi",
              tone: campaign.status === "Deviasi" ? "danger" : undefined,
            },
            {
              label: "Laba tambahan",
              value: campaign.profit,
              note: "Di atas acuan tanpa promo · Ilustrasi",
            },
          ]}
        />
        {campaign.id === "weekend" ? (
          <LineChart
            title="Pendapatan aktual vs prediksi"
            subtitle="11–13 September 2026 · Pendapatan kumulatif promo · Juta rupiah · Ilustrasi"
            series="MonitoringPrimarySeries"
            secondary="MonitoringMutedSeries"
            labels={[
              "11 Sep",
              "16.30",
              "17.00",
              "12 Sep",
              "17.00 ",
              "18.00",
              "13 Sep",
            ]}
            legend="Aktual (ilustrasi)"
          />
        ) : (
          <EmptyState title="Grafik aktual belum tersedia">
            Tidak ada seri pengukuran untuk promo contoh ini.
          </EmptyState>
        )}
        <div className="two-columns">
          <Card title="Periode lebih singkat bisa lebih efektif">
            <p className="muted">
              Kunjungan setelah pukul 18.00 lebih rendah dari proyeksi. Promo
              masih menguntungkan, tetapi kenaikannya lebih kecil dari
              perkiraan. Ini adalah narasi ilustrasi.
            </p>
            <h3>Langkah berikutnya</h3>
            <p>
              Ubah sisa periode promo ke pukul 16.00–18.00 dan fokus pada paket
              kopi.
            </p>
            <Button onClick={() => (location.hash = "chat")}>
              Tinjau strategi dengan AI
            </Button>
          </Card>
          <Card title="Riwayat ilustrasi">
            {[
              "13 Sep · 10.35 — Deviasi terdeteksi",
              "12 Sep · 18.00 — Kinerja harian ditinjau",
              "11 Sep · 16.00 — Periode promo dimulai",
              "10 Sep · 14.20 — Contoh persetujuan Rainer",
            ].map((item) => (
              <p key={item} className="caption muted">
                {item}
              </p>
            ))}
            <p className="caption">
              Riwayat bukan audit server. Realtime Prediction belum tersedia.
            </p>
          </Card>
        </div>
        {dialog && (
          <Modal title={dialog} onClose={() => setDialog(null)}>
            <Notice tone="warning">
              API penghentian promo dan pemeriksaan izin belum tersedia. Tidak
              ada promo yang dihentikan atau diubah.
            </Notice>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Kembali
            </Button>
            <Button disabled variant="danger">
              Konfirmasi penghentian
            </Button>
          </Modal>
        )}
      </>
    );
  const list = tab === "Aktif" ? campaigns : completedCampaigns;
  const filtered = list.filter(
    (item) =>
      item.title
        .toLocaleLowerCase("id")
        .includes(search.toLocaleLowerCase("id")) &&
      (status === "Semua status" || item.status === status) &&
      (outlet === "Semua Outlet" ||
        item.period.includes(outlet) ||
        item.period.includes("Semua outlet") ||
        item.id === "afternoon"),
  );
  return (
    <>
      <PageHeading
        title={
          tab === "Aktif" ? "Pantau setiap promo." : "Belajar dari setiap promo"
        }
        subtitle={
          tab === "Aktif"
            ? "Pantau kinerja, kenali deviasi, dan tentukan langkah berikutnya."
            : "Tinjau hasil dan gunakan strategi yang terbukti untuk promo berikutnya."
        }
      >
        <Button onClick={() => (location.hash = "chat")}>Buat dengan AI</Button>
      </PageHeading>
      <Metrics
        items={
          tab === "Aktif"
            ? [
                {
                  label: "Promo aktif",
                  value: "2",
                  note: "Di 3 outlet · Ilustrasi",
                },
                {
                  label: "Terjadwal",
                  value: "1",
                  note: "Menunggu jadwal ilustrasi",
                },
                {
                  label: "Pendapatan tambahan",
                  value: "Rp 6,8 jt",
                  note: "↗ 14,2% minggu ini · Ilustrasi",
                },
                {
                  label: "Perlu Perhatian",
                  value: "1",
                  note: "Promo Akhir Pekan",
                  tone: "danger",
                },
              ]
            : [
                {
                  label: "Promo selesai",
                  value: "8",
                  note: "Dalam 90 hari terakhir · Ilustrasi",
                },
                {
                  label: "Pendapatan tambahan",
                  value: "Rp 42,6 jt",
                  note: "Dari promo yang selesai · Ilustrasi",
                },
                {
                  label: "Kenaikan rata-rata",
                  value: "+16,8%",
                  note: "Dibanding nilai acuan ilustrasi",
                },
                {
                  label: "Temuan tersimpan",
                  value: "7",
                  note: "Contoh Memori AI, bukan server",
                },
              ]
        }
      />
      <div className="segmented flow-tabs" aria-label="Status promo">
        {["Aktif", "Selesai"].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setStatus("Semua status");
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="monitor-filters">
        <label className="field search-field">
          <span>Cari promo</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari promo…"
          />
        </label>
        <SelectField
          label="Status promo"
          value={status}
          options={
            tab === "Aktif"
              ? ["Semua status", "Deviasi", "Sesuai target", "Terjadwal"]
              : ["Semua status", "Selesai"]
          }
          onChange={setStatus}
        />
        <SelectField
          label="Outlet promo"
          value={outlet}
          options={["Semua Outlet", "Pusat Kota", "Kampus", "Riverside"]}
          onChange={setOutlet}
        />
      </div>
      <div className="campaign-grid">
        {filtered.map((item) => (
          <Card key={item.id} className="campaign-card">
            <p
              className={`caption ${item.status === "Deviasi" ? "warning" : item.status === "Sesuai target" ? "success" : "muted"}`}
            >
              {item.status}
            </p>
            <h2>{item.title}</h2>
            <p className="caption muted">{item.period}</p>
            <p className="caption muted">DAMPAK PENDAPATAN</p>
            <strong className="campaign-impact">{item.impact}</strong>
            <p
              className={`caption ${item.status === "Deviasi" ? "warning" : "success"}`}
            >
              {item.note}
            </p>
            <button
              className="text-button campaign-link"
              onClick={() =>
                tab === "Aktif"
                  ? (location.hash = `monitoring/${item.id}`)
                  : setDialog(item.title)
              }
            >
              Lihat Pemantauan →
            </button>
          </Card>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState title="Tidak ada promo yang cocok">
          Ubah kata pencarian, status, atau outlet.
        </EmptyState>
      )}
      {tab === "Aktif" ? (
        <Notice tone="warning">
          Demo: Promo Akhir Pekan 8,4% di bawah prediksi. Tinjau sebelum pukul
          18.00.
        </Notice>
      ) : (
        <Card title="Temuan: paket membantu menjaga margin">
          <p className="muted">
            Empat promo paket menaikkan nilai pesanan dengan margin kotor tetap
            di atas 60%. Temuan ini adalah contoh Memori AI.
          </p>
          <a href="#memory">Buka Memori AI →</a>
        </Card>
      )}
      {dialog && (
        <Modal title={dialog} onClose={() => setDialog(null)}>
          <p className="muted">
            Data hasil promo pada kartu adalah ilustrasi Figma. Detail Actual,
            audit, dan feedback server belum tersedia.
          </p>
          <Button
            onClick={() => {
              location.hash = "memory";
              setDialog(null);
            }}
          >
            Buka Memori AI
          </Button>
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Tutup
          </Button>
        </Modal>
      )}
    </>
  );
}
