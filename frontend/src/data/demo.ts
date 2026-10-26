// Isolated fixture data transcribed from Figma. Never a fallback for failed API requests.
import type { Metric } from "../components/ui";
export const overviewMetrics: Metric[] = [
  { label: "Pendapatan", value: "Rp 24,8 jt", note: "↗ 12,8% dari kemarin" },
  { label: "Laba", value: "Rp 8,2 jt", note: "↗ 8,4% dari kemarin" },
  { label: "Transaksi", value: "486", note: "↗ 10,2% dari kemarin" },
  {
    label: "Rata-rata Nilai Pesanan",
    value: "Rp 51.029",
    note: "↗ 2,4% dari kemarin",
  },
];
export const products = [
  { name: "Latte Es", amount: "Rp 5,4 jt", percent: 100 },
  { name: "Nasi Ayam", amount: "Rp 4,2 jt", percent: 78 },
  { name: "Americano", amount: "Rp 3,1 jt", percent: 57 },
  { name: "Matcha Latte", amount: "Rp 2,6 jt", percent: 48 },
  { name: "Kroisan Mentega", amount: "Rp 1,8 jt", percent: 33 },
];
export const categories = [
  { name: "Kopi", percent: 48, color: "var(--primary)" },
  { name: "Makanan", percent: 28, color: "var(--navy)" },
  { name: "Nonkopi", percent: 16, color: "var(--blue-mid)" },
  { name: "Pastri", percent: 8, color: "var(--soft-blue)" },
];
export const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const heatmap = [
  [15, 59, 59, 37, 81, 81, 59, 103],
  [81, 15, 15, 103, 37, 37, 59, 59],
  [37, 59, 81, 59, 37, 81, 81, 15],
  [59, 37, 81, 81, 59, 103, 59, 37],
  [37, 59, 59, 81, 103, 103, 81, 59],
  [59, 81, 103, 81, 103, 125, 103, 81],
  [37, 59, 81, 59, 81, 103, 81, 59],
];
