import type { Metric } from "../components/ui";

export const analyticsTabs = [
  "Produk",
  "Pelanggan",
  "Outlet",
  "Margin",
  "Musiman",
] as const;
export type AnalyticsTab = (typeof analyticsTabs)[number];
type AnalyticsDemo = {
  title: string;
  subtitle: string;
  metrics: Metric[];
  chart: string;
  chartSubtitle: string;
  line?: string;
  spark: string;
  insight: string;
  explanation: string;
  table: string;
  headers: string[];
  rows: string[][];
};
const metric = (
  label: string,
  value: string,
  note: string,
  tone?: "danger",
): Metric => ({ label, value, note, tone });
export const analyticsDemo: Record<AnalyticsTab, AnalyticsDemo> = {
  Produk: {
    title: "Pahami kinerja di balik angka",
    subtitle: "Kenali faktor permintaan, loyalitas, dan margin yang sehat.",
    metrics: [
      metric(
        "Pendapatan produk",
        "Rp 286,4 jt",
        "↗ 11,6% dari periode sebelumnya",
      ),
      metric("Produk terjual", "5.640", "↗ 8,1% dari periode sebelumnya"),
      metric("Margin kotor tertinggi", "72%", "Americano"),
      metric(
        "Produk bermargin rendah",
        "3",
        "Tinjau harga dan biaya",
        "danger",
      ),
    ],
    chart: "Produk terlaris belum tentu paling menguntungkan",
    chartSubtitle: "Margin kotor per produk · Beserta kontribusi pendapatan",
    spark: "SecondaryProductSpark",
    insight: "Jaga margin Anda",
    explanation:
      "Nasi Ayam menghasilkan pendapatan tinggi, tetapi margin 38% lebih rendah dari produk terlaris lain. Tinjau biaya bahan sebelum menambah diskon.",
    table: "Kinerja produk",
    headers: ["Produk", "Pendapatan", "Jumlah terjual", "Margin", "Tren"],
    rows: [
      ["Latte Es", "Rp 52,8 jt", "1.173", "68%", "+14,2%"],
      ["Nasi Ayam", "Rp 42,2 jt", "844", "38%", "+10,8%"],
      ["Americano", "Rp 34,1 jt", "1.137", "72%", "+8,4%"],
      ["Matcha Latte", "Rp 26,4 jt", "528", "61%", "+12,1%"],
      ["Kroisan Mentega", "Rp 18,6 jt", "620", "52%", "+6,3%"],
    ],
  },
  Pelanggan: {
    title: "Analitik / Pelanggan",
    subtitle:
      "Kenali pelanggan yang kembali, nilai belanjanya, dan potensi loyalitasnya.",
    metrics: [
      metric("Pelanggan unik", "3.248", "↗ 9,2% dari periode sebelumnya"),
      metric("Tingkat kunjungan ulang", "38,4%", "↗ 4,2 poin"),
      metric(
        "Nilai rata-rata pelanggan",
        "Rp 88.177",
        "↗ 3,6% dari periode sebelumnya",
      ),
      metric("Pelanggan baru", "642", "↗ 12,8% dari periode sebelumnya"),
    ],
    chart: "Pendapatan pelanggan berulang",
    chartSubtitle: "1–13 September · Juta rupiah",
    line: "SecondaryCustomersLine",
    spark: "SecondaryCustomersSpark",
    insight: "Ajak pelanggan sesekali kembali",
    explanation:
      "Poin loyalitas dapat mendorong kunjungan ulang. Mulai dari pelanggan yang baru sekali datang dalam 30 hari terakhir.",
    table: "Rincian pelanggan",
    headers: [
      "Segmen",
      "Pendapatan",
      "Pelanggan",
      "Tingkat kunjungan ulang",
      "Perubahan",
    ],
    rows: [
      ["Pelanggan setia", "Rp 126,0 jt", "864", "81%", "+16,2%"],
      ["Pelanggan sesekali", "Rp 94,4 jt", "1.128", "34%", "+8,4%"],
      ["Pelanggan baru", "Rp 44,8 jt", "642", "—", "+12,8%"],
      ["Pelanggan berisiko", "Rp 21,2 jt", "614", "12%", "−3,2%"],
    ],
  },
  Outlet: {
    title: "Analitik / Outlet",
    subtitle: "Bandingkan penjualan, permintaan, dan efisiensi antaroutlet.",
    metrics: [
      metric("Pendapatan outlet", "Rp 286,4 jt", "Di 3 outlet aktif"),
      metric("Kinerja terbaik", "Pusat Kota", "Rp 126,0 jt periode ini"),
      metric(
        "Pendapatan per outlet",
        "Rp 95,5 jt",
        "↗ 11,6% dari periode sebelumnya",
      ),
      metric("Margin rata-rata", "62,4%", "↗ 1,8 poin"),
    ],
    chart: "Tren pendapatan outlet",
    chartSubtitle: "Total pendapatan outlet · Juta rupiah",
    line: "SecondaryOutletsLine",
    spark: "SecondaryOutletsSpark",
    insight: "Kampus masih berpotensi tumbuh",
    explanation:
      "Outlet Kampus ramai saat makan siang, tetapi sepi pada sore hari. Uji paket pelajar pukul 14.00–17.00.",
    table: "Rincian outlet",
    headers: ["Outlet", "Pendapatan", "Transaksi", "Margin", "Perubahan"],
    rows: [
      ["Pusat Kota", "Rp 126,0 jt", "2.520", "64%", "+14,2%"],
      ["Kampus", "Rp 92,8 jt", "1.856", "61%", "+10,4%"],
      ["Riverside", "Rp 67,6 jt", "1.264", "60%", "+8,1%"],
    ],
  },
  Margin: {
    title: "Analitik / Margin",
    subtitle: "Telusuri sumber laba dan biaya yang meningkat.",
    metrics: [
      metric("Laba kotor", "Rp 178,7 jt", "↗ 14,9% dari periode sebelumnya"),
      metric("Margin kotor", "62,4%", "↗ 1,8 poin"),
      metric("Biaya bahan", "Rp 107,7 jt", "37,6% dari pendapatan"),
      metric("Di bawah target", "3 produk", "Tinjau biaya dan harga", "danger"),
    ],
    chart: "Tren laba kotor",
    chartSubtitle: "Laba kotor harian · Juta rupiah",
    line: "SecondaryMarginLine",
    spark: "SecondaryMarginSpark",
    insight: "Tinjau biaya makanan lebih lanjut",
    explanation:
      "Margin makanan masih di bawah target 60%. Tinjau porsi dan harga pemasok sebelum menambah diskon.",
    table: "Rincian margin",
    headers: ["Kategori", "Pendapatan", "Biaya", "Margin", "Perubahan"],
    rows: [
      ["Kopi", "Rp 137,5 jt", "Rp 44,0 jt", "68%", "+2,1 poin"],
      ["Makanan", "Rp 80,2 jt", "Rp 40,1 jt", "50%", "−1,2 poin"],
      ["Nonkopi", "Rp 45,8 jt", "Rp 16,0 jt", "65%", "+1,8 poin"],
      ["Pastri", "Rp 22,9 jt", "Rp 7,6 jt", "67%", "+0,8 poin"],
    ],
  },
  Musiman: {
    title: "Analitik / Musiman",
    subtitle:
      "Gunakan pola permintaan berulang untuk merencanakan stok, staf, dan promo.",
    metrics: [
      metric("Kenaikan akhir pekan", "+24,6%", "Dibanding hari kerja"),
      metric("Hari tersibuk", "Sabtu", "1,32× permintaan rata-rata"),
      metric("Kenaikan saat gajian", "+18,2%", "Tanggal 25–1 setiap bulan"),
      metric("Puncak permintaan berikutnya", "26 Sep", "Siapkan stok dan staf"),
    ],
    chart: "Permintaan sepanjang pekan",
    chartSubtitle: "Rata-rata harian · Juta rupiah",
    spark: "SecondarySeasonalSpark",
    insight: "Siapkan akhir pekan gajian",
    explanation:
      "Periode gajian berikutnya bertepatan dengan akhir pekan. Tambah stok kopi dan pastri, lalu siapkan staf pukul 17.00–19.00.",
    table: "Rincian musiman",
    headers: [
      "Pola",
      "Pendapatan rata-rata",
      "Transaksi",
      "Kenaikan",
      "Keyakinan",
    ],
    rows: [
      ["Sabtu malam", "Rp 29,8 jt", "612", "+32%", "Tinggi"],
      ["Pekan gajian", "Rp 27,2 jt", "548", "+18%", "Tinggi"],
      ["Minggu sore", "Rp 25,6 jt", "516", "+12%", "Sedang"],
      ["Senin pagi", "Rp 18,4 jt", "368", "−19%", "Tinggi"],
    ],
  },
};
export const productMargins = [
  { name: "Americano", margin: 72, revenue: "Rp 34,1 jt" },
  { name: "Latte Es", margin: 68, revenue: "Rp 52,8 jt" },
  { name: "Matcha Latte", margin: 61, revenue: "Rp 26,4 jt" },
  { name: "Kroisan Mentega", margin: 52, revenue: "Rp 18,6 jt" },
  { name: "Nasi Ayam", margin: 38, revenue: "Rp 42,2 jt" },
];
