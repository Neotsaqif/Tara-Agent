import { Card, Button } from "./ui";
import {
  resetAppearance,
  updateAppearance,
  useAppearance,
  type ThemePreference,
} from "../state/appearance";
import "../styles/appearance.css";

const themes: { value: ThemePreference; label: string; description: string }[] =
  [
    { value: "light", label: "Terang", description: "Tampilan terang klasik." },
    {
      value: "dark",
      label: "Gelap",
      description: "Surface gelap, teks terang.",
    },
    {
      value: "gray",
      label: "Abu-abu",
      description: "Netral dengan warna brand dan status.",
    },
    {
      value: "system",
      label: "Sistem",
      description: "Mengikuti tema perangkat.",
    },
  ];
export default function AppearanceSettings() {
  const appearance = useAppearance();
  return (
    <Card
      title="Tampilan"
      subtitle="Perubahan langsung diterapkan tanpa memuat ulang halaman."
    >
      <p className="caption muted" id="appearance-help">
        Pengaturan disimpan pada browser ini, bukan akun Anda. Jika penyimpanan
        browser diblokir atau penuh, perubahan hanya berlaku selama sesi ini.
      </p>
      <fieldset
        className="appearance-fieldset"
        aria-describedby="appearance-help"
      >
        <legend>Posisi Sidebar</legend>
        <div className="appearance-position">
          {(["left", "right"] as const).map((value) => (
            <label className="appearance-choice" key={value}>
              <input
                type="radio"
                name="sidebar-position"
                value={value}
                checked={appearance.sidebarPosition === value}
                onChange={() => updateAppearance({ sidebarPosition: value })}
              />
              <span>{value === "left" ? "Kiri" : "Kanan"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset
        className="appearance-fieldset"
        aria-describedby="appearance-help"
      >
        <legend>Tema tampilan</legend>
        <div className="appearance-themes">
          {themes.map(({ value, label, description }) => (
            <label className="appearance-choice appearance-theme" key={value}>
              <span
                className={`appearance-preview preview-${value}`}
                aria-hidden="true"
              >
                <i />
                <span>
                  <b />
                  <b />
                  <b />
                </span>
              </span>
              <span className="appearance-label">
                <input
                  type="radio"
                  name="appearance-theme"
                  value={value}
                  checked={appearance.theme === value}
                  onChange={() => updateAppearance({ theme: value })}
                />
                <strong>{label}</strong>
              </span>
              <span className="caption muted">{description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button variant="secondary" onClick={resetAppearance}>
          Reset tampilan
        </Button>
      </div>
    </Card>
  );
}
