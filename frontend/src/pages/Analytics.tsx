import { useEffect, useRef, useState } from "react";
import type { Mode } from "../App";
import {
  asset,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  Metrics,
  Modal,
  Notice,
  PageHeading,
  SelectField,
} from "../components/ui";
import {
  analyticsDemo,
  analyticsTabs,
  productMargins,
  type AnalyticsTab,
} from "../data/analytics-demo";
import "./secondary.css";

function TrendChart({ tab }: { tab: AnalyticsTab }) {
  const data = analyticsDemo[tab];
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / 658.82),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const days =
    tab === "Musiman"
      ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
      : ["01 Sep", "03 Sep", "05 Sep", "07 Sep", "09 Sep", "11 Sep", "13 Sep"];
  return (
    <Card
      title={data.chart}
      subtitle={data.chartSubtitle}
      className="secondary-chart-card"
    >
      <div
        className="secondary-chart"
        role="img"
        aria-label={`${data.chart}. Grafik ilustrasi Figma; sumbu vertikal 0 sampai 30 juta rupiah. ${tab === "Musiman" ? "Sabtu memiliki permintaan tertinggi." : "Tren meningkat selama 1–13 September."}`}
      >
        <div className="secondary-chart-grid" aria-hidden="true">
          {[30, 20, 10, 0].map((value) => (
            <div key={value}>
              <span>{value}</span>
              <i />
            </div>
          ))}
        </div>
        <div
          className="secondary-series-window"
          ref={viewport}
          aria-hidden="true"
        >
          {data.line ? (
            <img
              src={asset(data.line)}
              alt=""
              style={{ transform: `scale(${scale}, 1)` }}
            />
          ) : (
            <div className="secondary-week-bars">
              {[65, 83, 72, 102, 113, 144, 126].map((height, index) => (
                <i
                  key={index}
                  style={{ height: `${(height / 154) * 100}%` }}
                  className={index === 5 ? "peak" : ""}
                />
              ))}
            </div>
          )}
        </div>
        <div className="secondary-chart-ticks" aria-hidden="true">
          {days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
      <p className="secondary-chart-legend">
        ● &nbsp;{tab === "Margin" ? "Laba kotor" : "Pendapatan"}
      </p>
    </Card>
  );
}

const tabRoutes: Record<AnalyticsTab, string> = {
  Produk: "products",
  Pelanggan: "customers",
  Outlet: "outlets",
  Margin: "margin",
  Musiman: "seasonal",
};
function tabFromHash(): AnalyticsTab {
  return (
    analyticsTabs.find(
      (item) => window.location.hash === `#analytics/${tabRoutes[item]}`,
    ) ?? "Produk"
  );
}

export default function Analytics({ mode }: { mode: Mode }) {
  const [tab, setTab] = useState<AnalyticsTab>(tabFromHash);
  const [updating, setUpdating] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadUrls = useRef(new Set<string>());
  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    setUpdating(false);
    const urls = downloadUrls.current;
    return () => {
      if (updateTimer.current) clearTimeout(updateTimer.current);
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [mode]);
  const previewUpdate = () => {
    if (mode !== "demo") return;
    if (updateTimer.current) clearTimeout(updateTimer.current);
    setUpdating(true);
    updateTimer.current = setTimeout(() => setUpdating(false), 800);
  };
  const selectTab = (value: AnalyticsTab) => {
    setTab(value);
    window.location.hash = `#analytics/${tabRoutes[value]}`;
    previewUpdate();
  };
  const [period, setPeriod] = useState("1–13 Sep 2026");
  const [outlet, setOutlet] = useState("Semua Outlet");
  const [category, setCategory] = useState("Semua kategori");
  const [comparison, setComparison] = useState(false);
  const [product, setProduct] = useState<
    (typeof productMargins)[number] | null
  >(null);
  const [exported, setExported] = useState(false);
  const data = analyticsDemo[tab];
  const defaultFilters =
    period === "1–13 Sep 2026" &&
    outlet === "Semua Outlet" &&
    category === "Semua kategori";
  const available = mode === "demo" && defaultFilters;
  useEffect(() => {
    setProduct(null);
    setExported(false);
    setExportOpen(false);
    setComparison(false);
  }, [mode, tab, period, outlet, category]);
  const exportCsv = () => {
    if (!available) return;
    const quote = (value: string) =>
      `"${value.replace(/^(\s*)([=+@−-])/, "$1'$2").replace(/"/g, '""')}"`;
    const content = [
      ["DEMO / SIMULASI — bukan data bisnis aktual"],
      [data.table, period, outlet, category],
      data.headers,
      ...data.rows,
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `demo-analitik-${tab.toLowerCase()}-2026-09-13.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    downloadUrls.current.add(url);
    setExportOpen(false);
    setExported(true);
  };
  return (
    <div className="secondary-page analytics-page">
      <PageHeading title={data.title} subtitle={data.subtitle}>
        <Button disabled={!available} onClick={() => setExportOpen(true)}>
          Ekspor laporan
        </Button>
      </PageHeading>
      <div className="secondary-analytics-filters">
        <SelectField
          className="compact-field"
          label="Periode analitik"
          value={period}
          options={["1–13 Sep 2026", "1–31 Agu 2026"]}
          onChange={(value) => {
            setPeriod(value);
            previewUpdate();
          }}
        />
        <SelectField
          className="compact-field"
          label="Outlet analitik"
          value={outlet}
          options={["Semua Outlet", "Pusat Kota", "Kampus", "Riverside"]}
          onChange={(value) => {
            setOutlet(value);
            previewUpdate();
          }}
        />
        <SelectField
          className="compact-field"
          label="Kategori analitik"
          value={category}
          options={["Semua kategori", "Kopi", "Makanan", "Nonkopi", "Pastri"]}
          onChange={(value) => {
            setCategory(value);
            previewUpdate();
          }}
        />
        {tab === "Produk" && (
          <button
            className="secondary-compare"
            aria-pressed={comparison && available}
            disabled={!available}
            onClick={() => setComparison(!comparison)}
          >
            Bandingkan periode sebelumnya
          </button>
        )}
      </div>
      <div
        className="secondary-tabs"
        role="tablist"
        aria-label="Jenis analitik"
      >
        {analyticsTabs.map((item, index) => (
          <button
            key={item}
            id={`analytics-tab-${index}`}
            role="tab"
            aria-selected={tab === item}
            aria-controls="analytics-panel"
            tabIndex={tab === item ? 0 : -1}
            onClick={() => selectTab(item)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? analyticsTabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        analyticsTabs.length) %
                      analyticsTabs.length;
              selectTab(analyticsTabs[next]);
              document.getElementById(`analytics-tab-${next}`)?.focus();
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        className="secondary-panel"
        id="analytics-panel"
        role="tabpanel"
        aria-labelledby={`analytics-tab-${analyticsTabs.indexOf(tab)}`}
      >
        {exported && available && (
          <Notice>
            CSV demo diunduh ke perangkat ini. Tidak ada laporan bisnis aktual
            atau data server yang diekspor.
          </Notice>
        )}
        {comparison && available && tab === "Produk" && (
          <Notice>
            Perbandingan demo ditampilkan pada catatan KPI. Rincian periode
            sebelumnya belum tersedia; tidak ada perhitungan API yang
            dijalankan.
          </Notice>
        )}
        {!available ? (
          <EmptyState
            title={
              mode === "live"
                ? "Data analitik belum tersedia"
                : "Tidak ada data demo untuk filter ini"
            }
          >
            {mode === "live"
              ? "API analitik belum terhubung. Pilih Demo Figma untuk melihat data ilustrasi; ekspor data bisnis belum tersedia."
              : "Dataset Figma hanya mencakup 1–13 Sep 2026, semua outlet, dan semua kategori. Kembalikan filter untuk melihat ilustrasi."}
          </EmptyState>
        ) : (
          <>
            <Metrics items={data.metrics} />
            <div
              className={`secondary-analytics-detail ${tab === "Produk" ? "product-detail" : ""}`}
            >
              {tab === "Produk" ? (
                <Card
                  title={data.chart}
                  subtitle={data.chartSubtitle}
                  className="secondary-margin-card"
                >
                  <div className="secondary-margin-list">
                    {productMargins.map((item) => (
                      <button key={item.name} onClick={() => setProduct(item)}>
                        <span>{item.name}</span>
                        <span className="secondary-margin-track">
                          <i
                            style={{
                              width: `${item.margin}%`,
                              background:
                                item.margin < 40 ? "#f59e0b" : undefined,
                            }}
                          />
                        </span>
                        <strong>{item.margin}%</strong>
                        <small>{item.revenue}</small>
                      </button>
                    ))}
                  </div>
                </Card>
              ) : (
                <TrendChart tab={tab} />
              )}
              <div className="secondary-insights">
                <Card
                  className={
                    tab === "Produk"
                      ? "secondary-product-insight"
                      : "secondary-analytical-insight"
                  }
                >
                  <Icon name={data.spark} />
                  <h2>{data.insight}</h2>
                  <p>{data.explanation}</p>
                  <a
                    className={
                      tab === "Produk" ? "secondary-ai-link" : "button primary"
                    }
                    href={`#chat?context=${tabRoutes[tab]}`}
                  >
                    Analisis dengan AI{tab === "Produk" ? " →" : ""}
                  </a>
                </Card>
                {tab === "Produk" && (
                  <Card className="secondary-recommended">
                    <h3>3 produk perlu tinjauan harga</h3>
                    <p className="muted">
                      Mulai dari produk laris dengan margin rendah.
                    </p>
                    <a
                      className="button primary"
                      href={`#chat?context=${tabRoutes[tab]}`}
                    >
                      Diskusi dengan AI
                    </a>
                  </Card>
                )}
              </div>
            </div>
            <DataTable
              title={data.table}
              headers={data.headers}
              rows={data.rows}
            />
            <p className="secondary-footnote">
              {tab === "Produk"
                ? "Menampilkan 5 dari 24 produk · Margin kotor belum termasuk biaya operasional dan pajak."
                : "Data ilustrasi · 1–13 September 2026"}
            </p>
          </>
        )}
      </div>
      {updating && mode === "demo" && (
        <div className="secondary-toast bottom" role="status">
          Memperbarui analitik… · Simulasi lokal
        </div>
      )}
      {exportOpen && available && (
        <Modal title="Laporan siap" onClose={() => setExportOpen(false)}>
          <p className="muted">
            Demo ini memperagakan fitur laporan. Tampilan Analitik saat ini siap
            diekspor sebagai CSV demo; tidak ada data server yang diekspor.
          </p>
          <Button onClick={exportCsv}>Unduh CSV demo</Button>
          <Button variant="secondary" onClick={() => setExportOpen(false)}>
            Batal
          </Button>
        </Modal>
      )}
      {product && available && (
        <Modal title={product.name} onClose={() => setProduct(null)}>
          <p className="muted">Rincian ilustrasi Figma · 1–13 September 2026</p>
          <p>
            Margin kotor: <strong>{product.margin}%</strong>
          </p>
          <p>
            Kontribusi pendapatan: <strong>{product.revenue}</strong>
          </p>
          <p className="caption muted">
            Belum termasuk biaya operasional dan pajak. Tidak ada harga yang
            diubah.
          </p>
          <a
            className="button primary"
            href={`#chat?context=${tabRoutes[tab]}`}
          >
            Diskusi dengan AI
          </a>
          <Button variant="secondary" onClick={() => setProduct(null)}>
            Tutup
          </Button>
        </Modal>
      )}
    </div>
  );
}
