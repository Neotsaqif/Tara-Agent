import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, DemoLabel, Icon, Modal, SelectField } from "./components/ui";
import Overview from "./pages/Overview";
import Chat from "./pages/Chat";
import Monitoring from "./pages/Monitoring";
import Analytics from "./pages/Analytics";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";
import DecisionSandbox, { HealthStatus } from "./components/ApiFoundation";

export const pages = [
  "Ringkasan",
  "Chat AI",
  "Pemantauan",
  "Analitik",
  "Memori AI",
  "Pengaturan",
] as const;
export type Page = (typeof pages)[number];
const slugs = [
  "overview",
  "chat",
  "monitoring",
  "analytics",
  "memory",
  "settings",
];
const icons = [
  "IconOverview",
  "IconChat",
  "IconMonitor",
  "IconAnalytics",
  "IconMemory",
  "IconSettings",
];
export type Mode = "live" | "demo";
export function readPage(): Page {
  return (
    pages[slugs.indexOf(location.hash.slice(1).split("/")[0])] ?? "Ringkasan"
  );
}
export function navigate(page: Page) {
  location.hash = slugs[pages.indexOf(page)];
}

export function Workspace({
  children,
  page,
  mode,
  setMode,
}: {
  children: ReactNode;
  page: Page;
  mode: Mode;
  setMode: (mode: Mode) => void;
}) {
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menu]);
  const [outlet, setOutlet] = useState("Semua Outlet");
  const [date, setDate] = useState("13 Sep 2026");
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    setMenu(false);
  }, [page]);
  return (
    <div className="workspace">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Lewati navigasi
      </a>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Tutup navigasi"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`sidebar ${menu ? "open" : ""}`}
        id="workspace-navigation"
        aria-label="Navigasi ruang kerja"
      >
        <a className="brand" href="#overview">
          <Icon name="IconSpark1" brand />
          <span>Command</span>
        </a>
        <p className="brand-caption">ANALITIK F&B</p>
        <nav aria-label="Navigasi utama">
          {pages.slice(0, 5).map((item, index) => (
            <a
              key={item}
              href={`#${slugs[index]}`}
              aria-current={page === item ? "page" : undefined}
            >
              <Icon name={icons[index]} />
              <span>{item}</span>
            </a>
          ))}
        </nav>
        {page === "Chat AI" && (
          <details className="conversation-history" open>
            <summary>Percakapan</summary>
            <p className="caption muted">Riwayat belum tersimpan di server.</p>
            <a href="#chat">Tingkatkan penjualan sore</a>
          </details>
        )}
        <div className="sidebar-bottom">
          <div className="connection">
            <strong>
              {mode === "demo" ? "Ruang kerja demo" : "Mode API nyata"}
            </strong>
            <span>
              {mode === "demo"
                ? "Tidak ada aksi bisnis dijalankan"
                : "Data bisnis belum tersedia"}
            </span>
          </div>
          <a
            className="settings-link"
            href="#settings"
            aria-current={page === "Pengaturan" ? "page" : undefined}
          >
            <Icon name="IconSettings" />
            Pengaturan
          </a>
          <div className="account">
            <span className="avatar">{mode === "demo" ? "CR" : "—"}</span>
            <div>
              <strong>{mode === "demo" ? "Rainer" : "Belum login"}</strong>
              <span>
                {mode === "demo"
                  ? "Profil ilustrasi"
                  : "Autentikasi belum tersedia"}
              </span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            ref={menuButton}
            className="icon-button menu-toggle"
            aria-label={menu ? "Tutup navigasi" : "Buka navigasi"}
            aria-controls="workspace-navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <p className="breadcrumb">{page} / Ruang kerja</p>
          <div className="header-filters">
            <SelectField
              label="Outlet ruang kerja"
              className="compact-field"
              value={outlet}
              options={["Semua Outlet", "Pusat Kota", "Kampus", "Riverside"]}
              onChange={setOutlet}
            />
            <SelectField
              label="Tanggal ruang kerja"
              className="compact-field"
              value={date}
              options={["13 Sep 2026", "12 Sep 2026", "11 Sep 2026"]}
              onChange={setDate}
            />
            <button
              className="icon-button"
              aria-label="Notifikasi"
              onClick={() => setNotifications(true)}
            >
              <Icon name="IconBell" />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="content">
          <div className="mode-bar">
            <span>
              {mode === "demo" ? "Demo / simulasi" : "API nyata · fondasi"}
            </span>
            <div className="segmented" aria-label="Sumber data">
              <button
                aria-pressed={mode === "live"}
                onClick={() => setMode("live")}
              >
                API nyata
              </button>
              <button
                aria-pressed={mode === "demo"}
                onClick={() => setMode("demo")}
              >
                Demo Figma
              </button>
            </div>
          </div>
          {(outlet !== "Semua Outlet" || date !== "13 Sep 2026") && (
            <div className="notice info" role="status">
              Data untuk {outlet} · {date} belum tersedia. Angka demo di bawah
              tetap menggambarkan semua outlet pada 13 Sep 2026.
            </div>
          )}
          {children}
          {mode === "demo" && <DemoLabel />}
        </main>
      </div>
      {notifications && (
        <Modal
          title={
            mode === "demo"
              ? "1 promo perlu perhatian"
              : "Notifikasi belum tersedia"
          }
          onClose={() => setNotifications(false)}
        >
          <p className="muted">
            {mode === "demo"
              ? "Demo: Promo Akhir Pekan 8,4% di bawah prediksi. Buka Pemantauan untuk meninjau waktu dan penawarannya."
              : "API notifikasi belum tersedia. Tidak ada notifikasi bisnis yang dapat diverifikasi."}
          </p>
          <Button variant="secondary" onClick={() => setNotifications(false)}>
            Selesai
          </Button>
          {mode === "demo" && (
            <Button
              onClick={() => {
                navigate("Pemantauan");
                setNotifications(false);
              }}
            >
              Tinjau promo
            </Button>
          )}
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [mode, setMode] = useState<Mode>("live");
  useEffect(() => {
    const sync = () => setPage(readPage());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <Workspace page={page} mode={mode} setMode={setMode}>
      {page === "Ringkasan" ? (
        <Overview mode={mode} />
      ) : page === "Chat AI" ? (
        <Chat mode={mode} />
      ) : page === "Pemantauan" ? (
        <Monitoring mode={mode} />
      ) : page === "Analitik" ? (
        <Analytics mode={mode} />
      ) : page === "Memori AI" ? (
        <Memory mode={mode} />
      ) : (
        <>
          <Settings mode={mode} />
          <HealthStatus />
          <DecisionSandbox />
        </>
      )}
    </Workspace>
  );
}
