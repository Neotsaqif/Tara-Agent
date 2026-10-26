import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Button,
  DemoLabel,
  EmptyState,
  Icon,
  Modal,
  SelectField,
} from "./components/ui";
import { pages, slugs, parseRoute, pageHref, type Page } from "./routing";
export { pages, type Page } from "./routing";
import Overview from "./pages/Overview";
import Chat from "./pages/Chat";
import Monitoring from "./pages/Monitoring";
import Analytics from "./pages/Analytics";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";
import DecisionSandbox, { HealthStatus } from "./components/ApiFoundation";

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
  return parseRoute(location.hash).page;
}
export function navigate(page: Page) {
  location.hash = pageHref(page);
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
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    const background = shell.current;
    const trigger = menuButton.current;
    document.body.style.overflow = "hidden";
    if (background) background.inert = true;
    sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          sidebar.current?.querySelectorAll<HTMLElement>(
            'a[href], button, input, summary, select, [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const resize = () => {
      if (window.matchMedia("(min-width: 1025px)").matches) setMenu(false);
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = previousOverflow;
      if (background) background.inert = false;
      trigger?.focus();
    };
  }, [menu]);
  const [outlet, setOutlet] = useState("Semua Outlet");
  const [date, setDate] = useState("13 Sep 2026");
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    setNotifications(false);
    setOutlet("Semua Outlet");
    setDate("13 Sep 2026");
  }, [mode]);
  useEffect(() => {
    const changed = () => {
      setMenu(false);
      requestAnimationFrame(() =>
        document.getElementById("main-content")?.focus(),
      );
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
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
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            setMenu(false);
            requestAnimationFrame(() =>
              document.getElementById("main-content")?.focus(),
            );
          }
        }}
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
      <div className="main-shell" ref={shell}>
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
          {outlet !== "Semua Outlet" || date !== "13 Sep 2026" ? (
            <EmptyState
              title={
                mode === "demo"
                  ? "Fixture scope belum tersedia"
                  : "Data scope belum tersedia"
              }
            >
              {outlet} · {date}.{" "}
              {mode === "demo"
                ? "Demo hanya menyediakan semua outlet pada 13 Sep 2026. Kembalikan filter header untuk membuka skenario."
                : "API data bisnis belum tersedia. Tidak ada data demo yang digunakan sebagai pengganti."}
            </EmptyState>
          ) : (
            children
          )}
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
                location.hash = "#monitoring/weekend";
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
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const page = route.page;
  const [mode, setMode] = useState<Mode>("live");
  useEffect(() => {
    const sync = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <Workspace page={page} mode={mode} setMode={setMode}>
      <div key={`${mode}:${route.hash}`}>
        {!route.valid ? (
          <EmptyState title="Halaman tidak ditemukan">
            Alamat atau ID tidak dikenal.{" "}
            <a href="#overview">Kembali ke Ringkasan</a>.
          </EmptyState>
        ) : page === "Ringkasan" ? (
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
      </div>
    </Workspace>
  );
}
