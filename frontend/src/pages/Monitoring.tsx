import { useEffect, useState } from "react";
import type { Mode } from "../App";
import { useDemoSchedule } from "../state/demo-session";
import {
  asset,
  Button,
  Card,
  EmptyState,
  Metrics,
  Modal,
  Notice,
  PageHeading,
} from "../components/ui";
import {
  campaignSnapshot,
  monitoringCampaigns,
  monitoringChatLink,
  outletLabels,
  recentMonitoringActivity,
  statusLabels,
  type CampaignId,
  type CampaignStatus,
  type DemoCampaignState,
  type MonitoringCampaign,
  type OutletId,
} from "../data/monitoring-demo";
import "./flows.css";
import "./monitoring-prototype.css";

// Survives the application's full-hash remount, but never survives a page reload.
const demoStates = new Map<CampaignId, DemoCampaignState>();
export function resetMonitoringDemo() {
  demoStates.clear();
}
type Dialog =
  | "rethinking"
  | "strategy"
  | "review"
  | "stop"
  | "applying"
  | "stopping"
  | null;
function readRoute() {
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  return {
    detail: path.split("/")[1] ?? "",
    view: new URLSearchParams(query).get("view"),
  };
}
function previewState(
  campaign: MonitoringCampaign,
  view: string | null,
): DemoCampaignState | undefined {
  if (
    campaign.id === "weekend" &&
    ["adjusted", "improved", "stopped-adjusted"].includes(view ?? "")
  )
    return {
      status: view === "stopped-adjusted" ? "stopped" : "adjusted",
      adjusted: true,
    };
  if (
    (campaign.id === "weekend" || campaign.id === "lunch") &&
    view === "stopped"
  )
    return { status: "stopped", adjusted: false };
  if (campaign.id === "afternoon" && view === "cancelled")
    return { status: "cancelled", adjusted: false };
}
function Status({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`badge ${status === "deviation" || status === "scheduled" || status === "stopped" || status === "cancelled" ? "warning" : "success"}`}
    >
      {statusLabels[status]}
    </span>
  );
}
function MonitoringChart({
  campaign,
  adjusted,
}: {
  campaign: MonitoringCampaign;
  adjusted: boolean;
}) {
  const scheduled = campaign.id === "afternoon";
  const labels = scheduled
    ? ["14 Sep", "15 Sep", "16 Sep", "17 Sep", "18 Sep", "19 Sep", "20 Sep"]
    : ["11 Sep", "16.30", "17.00", "12 Sep", "17.00", "18.00", "13 Sep"];
  const [point, setPoint] = useState<number | null>(null);
  const variant = scheduled ? "scheduled" : adjusted ? "adjusted" : "original";
  const primary = scheduled
    ? "MonitoringVariantScheduledPrimary"
    : adjusted
      ? "MonitoringVariantAdjustedPrimary"
      : "MonitoringPrimarySeries";
  const muted = scheduled
    ? "MonitoringVariantScheduledMuted"
    : adjusted
      ? "MonitoringVariantAdjustedMuted"
      : "MonitoringMutedSeries";
  return (
    <Card
      className="monitoring-chart"
      title={
        scheduled ? "Proyeksi yang disetujui" : "Pendapatan aktual vs prediksi"
      }
      subtitle={
        scheduled
          ? "Jadwal yang disetujui · Prediction dalam juta rupiah · Ilustrasi"
          : "11–13 September 2026 · Pendapatan kumulatif promo · Juta rupiah · Ilustrasi"
      }
    >
      <div className="monitoring-plot-scroll">
        <div
          className={`monitoring-plot ${variant}`}
          role="group"
          aria-label={
            scheduled
              ? "Prediction vs acuan, data ilustrasi"
              : "Actual vs Prediction, data ilustrasi"
          }
        >
          <div className="monitoring-grid">
            {(scheduled ? [6, 4, 2, 0] : [30, 20, 10, 0]).map((value) => (
              <div key={value}>
                <span>{value}</span>
                <i />
              </div>
            ))}
          </div>
          <img
            className="monitoring-primary"
            src={asset(primary)}
            alt={scheduled ? "Prediction ilustrasi" : "Actual ilustrasi"}
          />
          <img
            className="monitoring-muted"
            src={asset(muted)}
            alt={scheduled ? "Acuan ilustrasi" : "Prediction ilustrasi"}
          />
          <div className="monitoring-ticks">
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          <div className="monitoring-hitpoints">
            {[0, 3, 6].map((index) => (
              <button
                key={index}
                aria-label={`Lihat titik ${labels[index]}`}
                onFocus={() => setPoint(index)}
                onBlur={() => setPoint(null)}
                onMouseEnter={() => setPoint(index)}
                onMouseLeave={() => setPoint(null)}
                onClick={() => setPoint(point === index ? null : index)}
              />
            ))}
          </div>
          {point !== null && (
            <output className="chart-tooltip">
              {labels[point]} · Ilustrasi Figma · Nilai titik terukur belum
              tersedia
            </output>
          )}
        </div>
      </div>
      <p className="chart-legend">
        ● {scheduled ? "Prediction" : "Actual"} (biru){" "}
        <span className="muted">
          {" "}
          · ┄{" "}
          {scheduled
            ? "Acuan"
            : adjusted
              ? "Realtime Prediction · Ilustrasi"
              : "Prediction"}{" "}
          (abu-abu)
        </span>
      </p>
    </Card>
  );
}
export default function Monitoring({ mode }: { mode: Mode }) {
  const demoSchedule = useDemoSchedule();
  const [route, setRoute] = useState(readRoute);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [outlet, setOutlet] = useState<OutletId | "all">("all");
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [result, setResult] = useState("");
  const base = monitoringCampaigns.find((item) => item.id === route.detail);
  const currentState = base
    ? (demoStates.get(base.id) ?? previewState(base, route.view))
    : undefined;
  const campaign = base ? campaignSnapshot(base, currentState) : undefined;
  const completed =
    route.detail === "completed" || campaign?.status === "completed";
  const terminal =
    campaign && ["stopped", "cancelled", "completed"].includes(campaign.status);
  const campaignId = campaign?.id;
  const scheduled = campaignId === "afternoon";
  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      setDialog(null);
      setResult("");
      setStatus("all");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (
      mode !== "demo" ||
      !campaignId ||
      !["rethinking", "applying", "stopping"].includes(dialog ?? "")
    )
      return;
    const timer = window.setTimeout(() => {
      if (dialog === "rethinking") {
        setDialog("strategy");
        return;
      }
      if (dialog === "applying") {
        demoStates.set(campaignId, { status: "adjusted", adjusted: true });
        setResult(
          "Demo: penyesuaian diterapkan secara lokal. Tidak ada promo bisnis yang diubah.",
        );
      } else {
        demoStates.set(campaignId, {
          status: scheduled ? "cancelled" : "stopped",
          adjusted: currentState?.adjusted ?? false,
        });
        setResult(
          scheduled
            ? "Demo: jadwal dibatalkan secara lokal. Tidak ada jadwal bisnis yang dibatalkan."
            : "Demo: promo dihentikan secara lokal. Tidak ada promo bisnis yang dihentikan.",
        );
      }
      setRevision((value) => value + 1);
      setDialog(null);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dialog, mode, campaignId, scheduled, currentState?.adjusted]); // Only cancellable local transitions, no network.
  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setOutlet("all");
  };
  const rethink = () =>
    setDialog(
      scheduled
        ? "review"
        : campaign?.id === "weekend" && !terminal
          ? "rethinking"
          : "review",
    );
  if (mode === "live")
    return (
      <>
        <PageHeading
          title="Pantau setiap promo."
          subtitle="Pantau kinerja, kenali deviasi, dan tentukan langkah berikutnya."
        />
        <EmptyState title="Belum ada data aktual">
          API campaign dan pemantauan belum tersedia. Prediction, Actual, dan
          Realtime Prediction tidak dapat diverifikasi. Tindakan bisnis tidak
          tersedia.
        </EmptyState>
      </>
    );
  if (route.detail && route.detail !== "completed" && !campaign)
    return (
      <EmptyState title="Promo tidak ditemukan">
        <a href="#monitoring">Kembali ke Pemantauan</a>
      </EmptyState>
    );
  const snapshots = monitoringCampaigns.map((item) =>
    campaignSnapshot(item, demoStates.get(item.id)),
  );
  const list = snapshots.filter((item) =>
    completed
      ? ["completed", "stopped", "cancelled"].includes(item.status)
      : !["completed", "stopped", "cancelled"].includes(item.status),
  );
  const filtered = list.filter(
    (item) =>
      item.title
        .toLocaleLowerCase("id")
        .includes(search.toLocaleLowerCase("id")) &&
      (status === "all" || item.status === status) &&
      (outlet === "all" || item.outlets.includes(outlet)),
  );
  const availableStatuses: CampaignStatus[] = completed
    ? ["completed", "stopped", "cancelled"]
    : ["deviation", "on-target", "scheduled", "adjusted"];
  return (
    <div className="monitoring-prototype" data-demo-revision={revision}>
      {campaign ? (
        <>
          <PageHeading
            title={campaign.title}
            subtitle={
              scheduled
                ? "Pemantauan / Promo terjadwal · Disetujui melalui simulasi AI"
                : "Pemantauan · Detail promo · Demo"
            }
          >
            <Button onClick={rethink}>Tinjau Ulang dengan AI</Button>
          </PageHeading>
          <a
            className="caption muted"
            href={completed ? "#monitoring/completed" : "#monitoring"}
          >
            ← Kembali ke Pemantauan
          </a>
          <div className="flow-toolbar monitoring-status">
            <Status status={campaign.status} />
            <p className="muted">
              {campaign.period}
              {!completed && ` · ${campaign.terms}`}
            </p>
            {!completed && (
              <Button
                variant="danger"
                disabled={!!terminal}
                onClick={() => setDialog("stop")}
              >
                {terminal
                  ? statusLabels[campaign.status]
                  : scheduled
                    ? "Batalkan Promo"
                    : "Hentikan Promo"}
              </Button>
            )}
          </div>
          {result && <Notice>{result}</Notice>}
          {scheduled && demoSchedule && (
            <Notice>
              Jadwal simulasi sesi ini: {demoSchedule.title} ·{" "}
              {demoSchedule.period} · {demoSchedule.outlet} ·{" "}
              {demoSchedule.offer} · {demoSchedule.hours}. Detail di bawah
              adalah fixture terjadwal Figma, bukan hasil eksekusi atau proyeksi
              baru. Tidak ada campaign dibuat atau dikirim.
            </Notice>
          )}
          {completed ? (
            <Modal
              title={campaign.title}
              onClose={() => {
                location.hash = "monitoring/completed";
              }}
            >
              <p className="success caption">Promo selesai · Demo</p>
              <p className="caption muted">{campaign.period}</p>
              <p className="campaign-impact">
                Pendapatan tambahan: {campaign.impact}
              </p>
              <p className="success">{campaign.note}</p>
              <p className="muted">{campaign.narrative.description}</p>
              <div className="monitoring-actions">
                <a className="button primary" href="#memory">
                  Buka Memori AI
                </a>
                <a
                  className="button secondary"
                  href={monitoringChatLink(campaign.id)}
                >
                  Bahas hasil dengan AI
                </a>
              </div>
              <p className="caption muted">
                Actual terperinci, Prediction, Realtime Prediction, dan audit
                server belum tersedia.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  location.hash = "monitoring/completed";
                }}
              >
                Tutup
              </Button>
            </Modal>
          ) : (
            <>
              <Metrics items={campaign.metrics} />
              {campaign.id === "weekend" || scheduled ? (
                <MonitoringChart
                  campaign={campaign}
                  adjusted={currentState?.adjusted ?? false}
                />
              ) : (
                <EmptyState title="Grafik aktual belum tersedia">
                  Seri Actual dan Prediction khusus Paket Hemat Siang belum
                  tersedia. Grafik Promo Akhir Pekan tidak digunakan untuk promo
                  ini.
                </EmptyState>
              )}
              <p className="caption muted">
                {scheduled
                  ? "Actual belum tersedia · Promo belum dimulai. "
                  : ""}
                Realtime Prediction{" "}
                {currentState?.adjusted
                  ? "adalah ilustrasi proyeksi penyesuaian, bukan data waktu nyata."
                  : "belum tersedia."}
              </p>
              <div className="two-columns">
                <Card
                  title={campaign.narrative.title}
                  className="monitoring-diagnosis"
                >
                  <p className="muted">{campaign.narrative.description}</p>
                  <Status status={campaign.status} />
                  <h3>
                    {scheduled ? "Ketentuan promo" : "Langkah berikutnya"}
                  </h3>
                  <p>{campaign.narrative.next}</p>
                  <div className="monitoring-actions">
                    <Button onClick={rethink}>Tinjau Ulang dengan AI</Button>
                    <Button
                      variant="danger"
                      disabled={!!terminal}
                      onClick={() => setDialog("stop")}
                    >
                      {terminal
                        ? statusLabels[campaign.status]
                        : scheduled
                          ? "Batalkan Promo"
                          : "Hentikan Promo"}
                    </Button>
                  </div>
                  <a className="caption" href={monitoringChatLink(campaign.id)}>
                    Bahas konteks dengan Chat AI →
                  </a>
                </Card>
                <Card title="Riwayat">
                  <ol className="monitoring-timeline">
                    {campaign.timeline.map((event, index) => (
                      <li key={`${event.title}-${index}`}>
                        <time>{event.time}</time>
                        <strong>{event.title}</strong>
                        <span className="caption muted">{event.note}</span>
                      </li>
                    ))}
                  </ol>
                  {!campaign.timeline.length && (
                    <p className="muted">
                      Riwayat khusus promo ini belum tersedia. Riwayat Promo
                      Akhir Pekan tidak digunakan.
                    </p>
                  )}
                  <p className="caption muted">
                    Ilustrasi Figma dan simulasi lokal, bukan audit server.
                  </p>
                </Card>
              </div>
              <Card>
                <dl className="monitoring-rules">
                  {[
                    ["Batas peringatan", "±10% dari prediksi"],
                    ["Tinjau jadwal", "Setiap hari pukul 18.00 WIB"],
                    ["Pemilik", "Rainer · Pemilik bisnis"],
                    ["Tinjauan berikutnya", campaign.nextReview],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </>
          )}
        </>
      ) : (
        <>
          <PageHeading
            title={
              completed ? "Belajar dari setiap promo" : "Pantau setiap promo."
            }
            subtitle={
              completed
                ? "Tinjau hasil dan gunakan strategi yang terbukti untuk promo berikutnya."
                : "Pantau kinerja, kenali deviasi, dan tentukan langkah berikutnya."
            }
          >
            <a className="button primary" href={monitoringChatLink()}>
              Buat dengan AI
            </a>
          </PageHeading>
          <Metrics
            items={
              completed
                ? [
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
                : [
                    {
                      label: "Promo aktif",
                      value: String(
                        snapshots.filter((item) =>
                          ["deviation", "on-target", "adjusted"].includes(
                            item.status,
                          ),
                        ).length,
                      ),
                      note: "Di 3 outlet · Ilustrasi",
                    },
                    {
                      label: "Terjadwal",
                      value: String(
                        snapshots.filter((item) => item.status === "scheduled")
                          .length,
                      ),
                      note: "Menunggu jadwal · Ilustrasi",
                    },
                    {
                      label: "Pendapatan tambahan",
                      value: "Rp 6,8 jt",
                      note: "↗ 14,2% minggu ini · Snapshot ilustrasi",
                    },
                    {
                      label: "Perlu Perhatian",
                      value: String(
                        snapshots.filter((item) => item.status === "deviation")
                          .length,
                      ),
                      note: "Promo Akhir Pekan",
                      tone: "danger",
                    },
                  ]
            }
          />
          <nav className="segmented flow-tabs" aria-label="Status promo">
            <a
              href="#monitoring"
              aria-current={!completed ? "page" : undefined}
            >
              Aktif
            </a>
            <a
              href="#monitoring/completed"
              aria-current={completed ? "page" : undefined}
            >
              Selesai
            </a>
          </nav>
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
            <label className="field">
              <span>Status promo</span>
              <select
                aria-label="Status promo"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as CampaignStatus | "all")
                }
              >
                <option value="all">Semua status</option>
                {availableStatuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Outlet promo</span>
              <select
                aria-label="Outlet promo"
                value={outlet}
                onChange={(event) =>
                  setOutlet(event.target.value as OutletId | "all")
                }
              >
                <option value="all">Semua Outlet</option>
                {(Object.keys(outletLabels) as OutletId[]).map((value) => (
                  <option key={value} value={value}>
                    {outletLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="campaign-grid">
            {filtered.map((item) => (
              <Card key={item.id} className="campaign-card">
                <Status status={item.status} />
                <h2>{item.title}</h2>
                <p className="caption muted">{item.period}</p>
                <p className="caption muted">
                  DAMPAK PENDAPATAN ·{" "}
                  {item.id === "afternoon" ? "Prediction" : "Actual ilustrasi"}
                </p>
                <strong className="campaign-impact">{item.impact}</strong>
                <p
                  className={`caption ${item.status === "deviation" ? "warning" : "success"}`}
                >
                  {item.note}
                </p>
                <a className="campaign-link" href={`#monitoring/${item.id}`}>
                  Lihat Pemantauan →
                  <span className="monitoring-sr-only"> {item.title}</span>
                </a>
              </Card>
            ))}
          </div>
          {!filtered.length && (
            <EmptyState title="Tidak ada promo yang cocok">
              Ubah kata pencarian, status, atau outlet.{" "}
              <Button variant="secondary" onClick={resetFilters}>
                Reset filter
              </Button>
            </EmptyState>
          )}
          {!completed &&
            snapshots.some((item) => item.status === "deviation") && (
              <Notice tone="warning">
                Demo: Promo Akhir Pekan 8,4% di bawah prediksi. Tinjau sebelum
                pukul 18.00.
              </Notice>
            )}
          {completed ? (
            <Card title="Temuan: paket membantu menjaga margin">
              <p className="muted">
                Empat promo paket menaikkan nilai pesanan dengan margin kotor
                tetap di atas 60%. Temuan ini adalah contoh Memori AI.
              </p>
              <a href="#memory">Buka Memori AI →</a>
            </Card>
          ) : (
            <Card title="Aktivitas terbaru">
              <ol className="monitoring-activity">
                {recentMonitoringActivity.map((item) => (
                  <li key={item.id}>
                    <time>{item.time}</time>
                    <a href={`#monitoring/${item.id}`}>{item.title}</a>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
      <p className="caption muted">
        Demo / simulasi lokal · Data ilustrasi Figma, bukan data bisnis aktual.
        Perubahan hanya di memori browser.
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          demoStates.clear();
          setRevision((value) => value + 1);
          setResult("");
          location.hash = "monitoring";
          resetFilters();
        }}
      >
        Reset demo pemantauan
      </Button>
      {dialog && campaign && (
        <Modal
          title={
            dialog === "rethinking"
              ? "Command AI sedang meninjau…"
              : dialog === "applying"
                ? "Menerapkan rekomendasi demo…"
                : dialog === "stopping"
                  ? scheduled
                    ? "Membatalkan jadwal demo…"
                    : "Menghentikan promo demo…"
                  : dialog === "strategy"
                    ? "Waktu yang lebih tepat untuk promo ini"
                    : dialog === "review"
                      ? scheduled
                        ? "Tinjau strategi yang disetujui"
                        : "Tinjau kinerja promo"
                      : scheduled
                        ? "Batalkan promo terjadwal ini?"
                        : `Hentikan ${campaign.title}?`
          }
          onClose={() => setDialog(null)}
        >
          <Notice>
            Demo frontend saja. Tidak ada permintaan API, persetujuan server,
            atau perubahan promo bisnis.
          </Notice>
          {["rethinking", "applying", "stopping"].includes(dialog) ? (
            <>
              <p role="status">
                {dialog === "rethinking"
                  ? "Membandingkan hasil aktual dengan proyeksi · Simulasi lokal"
                  : "Memperbarui status demo lokal…"}
              </p>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Batalkan proses demo
              </Button>
            </>
          ) : dialog === "strategy" ? (
            <div className="monitoring-dialog-content">
              <p className="caption">COMMAND AI · TINJAUAN KINERJA · DEMO</p>
              <p>
                Kunjungan setelah pukul 18.00 lebih rendah dari proyeksi.
                Fokuskan sisa promo pada jam sore yang paling ramai.
              </p>
              <Card className="monitoring-suggestion" title="Saran penyesuaian">
                <strong>16.00–19.00 menjadi 16.00–18.00</strong>
                <p className="caption muted">
                  Fokus pada paket kopi. Data kinerja sebelumnya tetap
                  tersimpan.
                </p>
              </Card>
              <Notice>
                Estimasi deviasi: −8,4% menjadi −2,6% · Proyeksi margin: 63% ·
                Untuk sisa periode promo.
              </Notice>
              <p className="caption muted">
                Berdasarkan 90 hari penjualan dan hasil promo sebelumnya. Tinjau
                kembali pada pemeriksaan harian berikutnya. Seluruhnya ilustrasi
                Figma.
              </p>
              <Button onClick={() => setDialog("applying")}>
                Terapkan Rekomendasi · Demo
              </Button>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Pertahankan Strategi
              </Button>
            </div>
          ) : dialog === "review" ? (
            <div className="monitoring-dialog-content">
              <p>
                {scheduled
                  ? "Promo belum dimulai. Bandingkan penawaran dan margin melalui simulasi sebelum menyesuaikannya kembali."
                  : campaign.narrative.description}
              </p>
              <a
                className="button primary"
                href={monitoringChatLink(campaign.id)}
              >
                {scheduled ? "Tinjau Simulasi" : "Bahas dengan AI"}
              </a>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Pertahankan Strategi
              </Button>
            </div>
          ) : (
            <div className="monitoring-dialog-content">
              <strong>{campaign.title}</strong>
              <p>
                {scheduled
                  ? "Sisa jadwal akan dibatalkan. Riwayat simulasi dan persetujuan tetap tersedia."
                  : "Sisa jadwal promo akan dihentikan. Data kinerja sebelumnya tetap tersedia."}
              </p>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                {scheduled ? "Pertahankan Jadwal" : "Batal"}
              </Button>
              <Button variant="danger" onClick={() => setDialog("stopping")}>
                {scheduled ? "Batalkan Promo · Demo" : "Hentikan Promo · Demo"}
              </Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
