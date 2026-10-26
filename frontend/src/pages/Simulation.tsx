import { useEffect, useRef, useState } from "react";
import {
  asset,
  Button,
  Card,
  Icon,
  Metrics,
  Modal,
  Notice,
  PageHeading,
  SelectField,
} from "../components/ui";
import { recommendations } from "../data/campaigns-demo";
import {
  defaultParameters,
  getSimulationSnapshot,
  initialSimulationParameters,
  optionOffers,
  simulationOfferId,
} from "../data/simulation-demo";
import { setDemoSchedule } from "../state/demo-session";
import "../styles/pages/flows.css";
import "../styles/pages/chat-prototype.css";

export default function Simulation({
  optionId,
  onBack,
  initialSnapshot,
}: {
  optionId: string;
  onBack: () => void;
  initialSnapshot?: string;
}) {
  const option = recommendations.find((item) => item.id === optionId);
  const [period, setPeriod] = useState(defaultParameters.period);
  const [outlet, setOutlet] = useState(defaultParameters.outlet);
  const initial = initialSimulationParameters(optionId, initialSnapshot);
  const [offer, setOffer] = useState(initial.offer);
  const [hours, setHours] = useState(initial.hours);
  const [dialog, setDialog] = useState<
    "confirm" | "scheduling" | "scheduled" | "history" | null
  >(null);
  const snapshot = getSimulationSnapshot(optionId, {
    period,
    outlet,
    offer,
    hours,
  });
  const chart = useRef<HTMLDivElement>(null);
  const [chartScale, setChartScale] = useState(1);
  useEffect(() => {
    if (!chart.current) return;
    const element = chart.current;
    const resize = () => setChartScale(element.clientWidth / 1038.12);
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [snapshot]);
  useEffect(() => {
    if (dialog !== "scheduling") return;
    const timer = window.setTimeout(() => {
      setDemoSchedule({
        optionId,
        title: option?.title ?? "",
        period,
        outlet,
        offer,
        hours,
      });
      setDialog("scheduled");
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [dialog, hours, offer, option?.title, optionId, outlet, period]);
  const updateOffer = (value: string) => {
    setOffer(value);
    const id = simulationOfferId(optionId, value);
    if (id && location.hash.startsWith("#chat/simulation/")) {
      const [path, query = ""] = location.hash.split("?");
      const params = new URLSearchParams(query);
      params.set("offer", id);
      // Keep edited period/outlet/hours local; hash navigation would reset them.
      history.pushState(null, "", `${path}?${params}`);
    }
  };
  return (
    <div className="simulation-prototype">
      <PageHeading
        title="Simulasikan sebelum menyetujui"
        subtitle={option?.title ?? "Opsi tidak dikenal"}
      >
        <Button onClick={onBack}>Kembali ke Chat AI</Button>
      </PageHeading>
      <Notice>
        <span className="simulation-notice">
          <Icon name="VariantNoticeBell" />
          <span>
            {snapshot
              ? "Demo / simulasi siap · Tinjau snapshot ilustrasi sebelum menyetujui."
              : "Parameter berubah. API simulasi belum tersedia; snapshot proyeksi untuk kombinasi ini belum tersedia."}
          </span>
        </span>
      </Notice>
      <Card>
        <div className="simulation-fields">
          <SelectField
            label="Periode promo"
            value={period}
            options={[defaultParameters.period, "14–27 Sep 2026"]}
            onChange={setPeriod}
          />
          <SelectField
            label="Outlet sasaran"
            value={outlet}
            options={[
              defaultParameters.outlet,
              "Pusat Kota",
              "Kampus",
              "Riverside",
            ]}
            onChange={setOutlet}
          />
          <SelectField
            label="Penawaran"
            value={offer}
            options={[...new Set([offer, ...(optionOffers[optionId] ?? [])])]}
            onChange={updateOffer}
          />
          <SelectField
            label="Jam"
            value={hours}
            options={[defaultParameters.hours, "14.00–16.00", "16.00–18.00"]}
            onChange={setHours}
          />
        </div>
      </Card>
      <Metrics
        items={[
          {
            label: "Proyeksi pendapatan",
            value: snapshot ? "Rp 27,6 jt" : "Belum tersedia",
            note: snapshot
              ? "↗ +15,0% dari acuan ilustrasi"
              : "Memerlukan API simulasi",
          },
          {
            label: "Pendapatan tambahan",
            value: snapshot ? "Rp 3,6 jt" : "Belum tersedia",
            note: snapshot
              ? "Kisaran Rp 2,9–4,5 jt · Ilustrasi"
              : "Belum dihitung",
          },
          {
            label: "Proyeksi margin",
            value: snapshot ? "64%" : "Belum tersedia",
            note: snapshot ? "Di atas target contoh 60%" : "Belum dihitung",
          },
          {
            label: "Keyakinan",
            value: snapshot ? "82%" : "Belum tersedia",
            note: snapshot
              ? "Ilustrasi 90 hari penjualan"
              : "Tidak ada model prediksi aktif",
          },
        ]}
      />
      {snapshot ? (
        <Card
          title="Proyeksi vs pendapatan acuan"
          subtitle="14–20 September 2026 · Pendapatan sore · Juta rupiah · Ilustrasi"
          className="chart-card"
        >
          <div
            className="snapshot-chart"
            role="group"
            aria-label="Proyeksi vs pendapatan acuan, data ilustrasi"
          >
            <div className="snapshot-grid">
              {[6, 4, 2, 0].map((value) => (
                <div key={value}>
                  <span>{value}</span>
                  <i />
                </div>
              ))}
            </div>
            <div className="snapshot-series" ref={chart}>
              <div
                className="snapshot-series-viewport"
                style={{ transform: `scaleX(${chartScale})` }}
              >
                <img
                  src={asset(snapshot.primary)}
                  width={snapshot.width}
                  height={snapshot.height}
                  alt="Tren ilustrasi dari desain Figma"
                />
                <img
                  src={asset(snapshot.muted)}
                  width={1038.06}
                  height={109.051}
                  alt="Nilai acuan ilustrasi"
                />
              </div>
            </div>
            <div className="snapshot-ticks">
              {[14, 15, 16, 17, 18, 19, 20].map((day) => (
                <span key={day}>{day} Sep</span>
              ))}
            </div>
          </div>
          <p className="chart-legend">
            ● Proyeksi (biru){" "}
            <span className="muted"> · ┄ Acuan (abu-abu)</span>
          </p>
        </Card>
      ) : (
        <Notice tone="warning">
          Grafik tidak ditampilkan karena proyeksi untuk parameter ini belum
          tersedia. Tidak ada kalkulasi bisnis atau tingkat keyakinan yang
          dibuat di browser.
        </Notice>
      )}
      <p className="caption muted">
        {snapshot ? snapshot.label : "Snapshot tidak didukung"} · Menu dan
        navigasi prototipe menentukan penawaran snapshot. KPI berulang mengikuti
        desain Figma, bukan hasil hitung ulang. Label dasar 15% pada frame
        varian tidak digunakan sebagai parameter aktif.
      </p>
      <div className="two-columns">
        <Card title="Asumsi simulasi">
          <ul className="assumptions">
            <li>Harga menu dan jam buka tetap.</li>
            <li>Stok pastri cukup untuk 70 paket per hari.</li>
            <li>Kunjungan dan cuaca hari kerja normal.</li>
            <li>Tidak ada promo diskon yang tumpang tindih.</li>
          </ul>
          <button className="text-button" onClick={() => setDialog("history")}>
            Lihat alasan dan data historis →
          </button>
        </Card>
        <Card>
          <span className="badge success">Tinjauan margin</span>
          <h2>Siap menjadwalkan promo ini?</h2>
          <p className="muted">
            Konfirmasi hanya memutar alur demo dan menambah contoh jadwal selama
            sesi ini. Tidak ada approval atau promo bisnis yang disimpan.
          </p>
          <div className="actions">
            <Button
              variant="secondary"
              onClick={() =>
                document
                  .querySelector<HTMLSelectElement>(".simulation-fields select")
                  ?.focus()
              }
            >
              Ubah Simulasi
            </Button>
            <Button disabled={!snapshot} onClick={() => setDialog("confirm")}>
              Simulasikan penjadwalan
            </Button>
          </div>
          <p className="caption muted">
            Peringatan deviasi: ±10% · Tinjauan harian pukul 18.00 · Ilustrasi
          </p>
        </Card>
      </div>
      <p className="caption muted">
        Hasil simulasi ilustratif · Hasil aktual dapat berbeda. Tidak ada
        request jaringan atau perhitungan prediksi.
      </p>
      {dialog === "confirm" && (
        <Modal
          title="Simulasikan penjadwalan promo ini?"
          onClose={() => setDialog(null)}
        >
          <p className="muted">
            Tinjau ketentuan sebelum menjadwalkan contoh demo.
          </p>
          <div className="terms">
            <h2>{option?.title}</h2>
            {[
              ["Periode promo", period],
              ["Outlet terpilih", outlet],
              ["Penawaran", offer],
              ["Jam", hours],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="caption muted">{label}</p>
                <p>{value}</p>
              </div>
            ))}
          </div>
          <p className="caption muted">Proyeksi margin</p>
          <strong>{snapshot ? "64%" : "Belum tersedia"}</strong>
          <p className="caption muted">
            Demo / simulasi · Jadwal hanya disimpan dalam memori sesi. Tidak ada
            campaign dibuat atau dikirim, persetujuan, atau eksekusi bisnis.
          </p>
          <div className="actions">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button
              disabled={!snapshot}
              onClick={() => setDialog("scheduling")}
            >
              Konfirmasi simulasi
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "scheduling" && (
        <Modal title="Menjadwalkan promo demo…" onClose={() => setDialog(null)}>
          <p className="muted">
            Menyiapkan contoh penawaran, outlet, dan jadwal lokal.
          </p>
          <Button disabled>Memproses…</Button>
          <button
            className="text-button caption"
            onClick={() => setDialog(null)}
          >
            Batalkan demo
          </button>
        </Modal>
      )}
      {dialog === "scheduled" && (
        <Modal
          title="Simulasi penjadwalan selesai"
          onClose={() => setDialog(null)}
        >
          <img
            className="demo-scheduled-check"
            src={asset("ChatScheduledCheck")}
            alt=""
          />
          <h2>{option?.title}</h2>
          <p className="muted">
            Simulasi selesai; tidak ada campaign dibuat atau dikirim. Contoh
            jadwal hanya tersedia selama sesi ini.
          </p>
          <a className="button primary" href="#monitoring/afternoon">
            Lihat Pemantauan
          </a>
          <a className="button secondary" href="#overview">
            Kembali ke Ringkasan
          </a>
        </Modal>
      )}
      {dialog === "history" && (
        <Modal
          title="Alasan dan data historis demo"
          onClose={() => setDialog(null)}
        >
          <p>
            {option?.rationale ?? "Tidak ada snapshot historis untuk opsi ini."}
          </p>
          <Notice>
            Seluruh asumsi adalah contoh desain, belum diverifikasi. Tidak ada
            data penjualan aktual yang terhubung.
          </Notice>
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Kembali ke simulasi
          </Button>
        </Modal>
      )}
    </div>
  );
}
