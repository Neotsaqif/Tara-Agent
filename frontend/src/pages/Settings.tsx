import { useId, useState, type FormEvent } from "react";
import type { Mode } from "../App";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  Notice,
  PageHeading,
} from "../components/ui";
import "./secondary.css";

type Draft = {
  business: string;
  category: string;
  timezone: string;
  currency: string;
  deviation: string;
  margin: string;
  digest: string;
  risk: string;
};
const sections = [
  "Profil bisnis",
  "Integrasi",
  "Notifikasi",
  "Pengguna & akses",
  "Preferensi AI",
];
const risks = [
  { title: "Konservatif", description: "Jaga margin dan batasi risiko." },
  { title: "Seimbang", description: "Seimbangkan pertumbuhan dan margin." },
  { title: "Fokus pertumbuhan", description: "Ambil risiko untuk tumbuh." },
];
function SettingsForm({ mode }: { mode: Mode }) {
  const [draft, setDraft] = useState<Draft>({
    business: mode === "demo" ? "Command Demo Café" : "",
    category: mode === "demo" ? "Kafe & restoran" : "",
    timezone: "Asia/Jakarta · WIB",
    currency: "Rupiah Indonesia · IDR",
    deviation: "10",
    margin: "60",
    digest: "18:00",
    risk: "Seimbang",
  });
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const formId = useId();
  const update = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreview(true);
  };
  const field = (
    key: keyof Draft,
    label: string,
    type = "text",
    limits?: { min: number; max: number },
  ) => (
    <label
      className="field secondary-settings-field"
      htmlFor={`${formId}-${key}`}
    >
      <span>{label}</span>
      <input
        id={`${formId}-${key}`}
        type={type}
        value={draft[key]}
        onChange={(event) => update(key, event.target.value)}
        {...limits}
        step={type === "number" ? "0.1" : undefined}
        required={key === "business"}
        maxLength={type === "text" ? 160 : undefined}
        placeholder={key === "business" ? "Nama bisnis Anda" : undefined}
      />
    </label>
  );
  return (
    <div className="secondary-page settings-page">
      <PageHeading
        title="Pengaturan"
        subtitle="Atur ruang kerja bisnis dan cara AI membantu Anda."
      >
        <Button type="submit" form={formId}>
          Pratinjau Perubahan
        </Button>
      </PageHeading>
      <Notice>
        Pratinjau lokal saja. Pengaturan belum dimuat dari server dan perubahan
        tidak disimpan. Integrasi serta pengelolaan akses memerlukan API dan
        autentikasi.
      </Notice>
      <div className="secondary-settings-layout">
        <nav
          className="secondary-settings-navigation"
          aria-label="Bagian pengaturan"
        >
          {sections.map((section, index) => (
            <button
              key={section}
              aria-current={active === index ? "location" : undefined}
              onClick={() => {
                setActive(index);
                document
                  .getElementById(`${formId}-section-${index}`)
                  ?.scrollIntoView({ behavior: "instant", block: "start" });
              }}
            >
              {section}
            </button>
          ))}
        </nav>
        <form
          id={formId}
          onSubmit={submit}
          className="secondary-settings-sections"
        >
          <div
            id={`${formId}-section-0`}
            className="secondary-settings-section"
          >
            <Card
              title="Profil bisnis"
              subtitle="Informasi dasar bisnis F&B Anda."
            >
              <div className="secondary-profile-fields">
                <div>
                  {field("business", "Nama bisnis")}
                  {field("category", "Kategori bisnis")}
                </div>
                <div>
                  {field("timezone", "Zona waktu")}
                  {field("currency", "Mata uang")}
                </div>
              </div>
            </Card>
          </div>
          <div
            id={`${formId}-section-1`}
            className="secondary-settings-section"
          >
            <Card
              title="Integrasi"
              subtitle="Sinkronkan data penjualan, stok, dan akuntansi."
            >
              {[
                { title: "Kasir", description: "Penjualan dan transaksi" },
                { title: "Sistem stok", description: "Stok dan biaya bahan" },
                {
                  title: "Akuntansi",
                  description: "Hubungkan laporan laba dan pengeluaran",
                },
              ].map((item) => (
                <div className="secondary-integration-row" key={item.title}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description} · Belum terhubung</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setExplanation(
                        `${item.title} belum terhubung. Koneksi memerlukan API integrasi dan autentikasi yang belum tersedia. Tidak ada koneksi atau sinkronisasi yang dijalankan.`,
                      )
                    }
                  >
                    Detail koneksi
                  </Button>
                </div>
              ))}
            </Card>
          </div>
          <div
            id={`${formId}-section-2`}
            className="secondary-settings-section"
          >
            <Card title="Batas notifikasi">
              <div className="secondary-notification-fields">
                {field("deviation", "Deviasi pendapatan (±%)", "number", {
                  min: 0.1,
                  max: 100,
                })}
                {field("margin", "Batas minimum margin (%)", "number", {
                  min: 0,
                  max: 100,
                })}
                {field("digest", "Ringkasan harian (WIB)", "time")}
              </div>
              <p className="caption muted">
                Peringatan awal muncul pada ±5%. Peringatan kritis mengikuti
                batas di atas. Ini hanya pratinjau; tidak ada notifikasi yang
                dijadwalkan.
              </p>
            </Card>
          </div>
          <div
            id={`${formId}-section-3`}
            className="secondary-settings-section"
          >
            <Card>
              <div className="secondary-users-heading">
                <h2>Pengguna &amp; akses</h2>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setExplanation(
                      "Undangan pengguna memerlukan autentikasi dan API pengelolaan akses yang belum tersedia. Tidak ada undangan yang dikirim atau izin yang diubah.",
                    )
                  }
                >
                  Tentang undangan
                </Button>
              </div>
              {mode === "demo" ? (
                <>
                  <p className="caption muted">
                    Daftar ilustrasi Figma; bukan pengguna atau izin aktif.
                  </p>
                  <div
                    className="table-scroll"
                    role="region"
                    aria-label="Ilustrasi pengguna dan akses"
                    tabIndex={0}
                  >
                    <table>
                      <thead className="secondary-sr-only">
                        <tr>
                          <th scope="col">Nama</th>
                          <th scope="col">Peran</th>
                          <th scope="col">Akses ilustrasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Rainer", "Pemilik", "Akses penuh"],
                          [
                            "Manajer outlet",
                            "Manajer",
                            "Hanya outlet yang ditugaskan",
                          ],
                          ["Tim keuangan", "Analis", "Baca dan ekspor"],
                        ].map((row) => (
                          <tr key={row[0]}>
                            <th scope="row">{row[0]}</th>
                            <td>{row[1]}</td>
                            <td>{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState title="Daftar pengguna belum tersedia">
                  Autentikasi dan API akses belum terhubung. Tidak ada izin
                  pengguna yang dapat diverifikasi.
                </EmptyState>
              )}
            </Card>
          </div>
          <div
            id={`${formId}-section-4`}
            className="secondary-settings-section"
          >
            <Card
              title="Preferensi risiko AI"
              subtitle="Pilih prioritas AI untuk bisnis Anda."
            >
              <fieldset className="secondary-risk-options">
                <legend className="secondary-sr-only">
                  Prioritas risiko AI untuk pratinjau lokal
                </legend>
                {risks.map((risk) => (
                  <label
                    key={risk.title}
                    className={draft.risk === risk.title ? "selected" : ""}
                  >
                    <span>
                      <input
                        type="radio"
                        name={`${formId}-risk`}
                        checked={draft.risk === risk.title}
                        onChange={() => update("risk", risk.title)}
                      />
                      <strong>{risk.title}</strong>
                    </span>
                    <small>{risk.description}</small>
                  </label>
                ))}
              </fieldset>
              <p className="caption muted">
                Rekomendasi AI selalu memerlukan persetujuan Anda sebelum
                dijalankan. Pilihan di sini hanya mengubah pratinjau lokal.
              </p>
            </Card>
          </div>
        </form>
      </div>
      {preview && (
        <Modal
          title="Pratinjau perubahan lokal"
          onClose={() => setPreview(false)}
        >
          <Notice>
            Belum disimpan ke server. Menutup atau memuat ulang halaman dapat
            menghapus isian ini.
          </Notice>
          <dl className="secondary-preview-list">
            {[
              ["Nama bisnis", draft.business],
              ["Kategori bisnis", draft.category || "Belum diisi"],
              ["Zona waktu", draft.timezone],
              ["Mata uang", draft.currency],
              ["Deviasi pendapatan", `±${draft.deviation}%`],
              ["Batas minimum margin", `${draft.margin}%`],
              ["Ringkasan harian", `${draft.digest} WIB`],
              ["Prioritas AI", draft.risk],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <Button variant="secondary" onClick={() => setPreview(false)}>
            Kembali mengedit
          </Button>
        </Modal>
      )}
      {explanation && (
        <Modal
          title="Fitur belum terhubung"
          onClose={() => setExplanation(null)}
        >
          <p>{explanation}</p>
          <Button variant="secondary" onClick={() => setExplanation(null)}>
            Mengerti
          </Button>
        </Modal>
      )}
    </div>
  );
}
export default function Settings({ mode }: { mode: Mode }) {
  return <SettingsForm key={mode} mode={mode} />;
}
