// Figma-only fixtures. Not persisted, executed, or returned by a business API.
export const recommendations = [
  { id: "A", title: "Paket Kopi Sore", description: "Paket kopi + pastri, pukul 14.00–17.00.", impact: "+12–18% pendapatan", risk: "Risiko rendah · Margin 64%", margin: "64%", rationale: "Dalam 4 promo terakhir, paket menaikkan nilai pesanan rata-rata 14% dengan margin tetap di atas 60%.", revenue: "Rp 27,6 jt", additional: "Rp 3,6 jt", confidence: "82%" },
  { id: "B", title: "Poin Loyalitas Ganda", description: "Dapatkan 2× poin untuk pesanan sore.", impact: "+8–12% pendapatan", risk: "Risiko rendah · Margin 66%", margin: "66%", rationale: "Poin loyalitas mendorong kunjungan ulang tanpa diskon harga langsung. Estimasi dan bukti pada contoh ini hanya ilustrasi.", revenue: "Belum tersedia", additional: "Belum tersedia", confidence: "Belum tersedia" },
  { id: "C", title: "Diskon Sore 20%", description: "Diskon terbatas pukul 14.00–16.00.", impact: "+18–24% pendapatan", risk: "Risiko sedang · Margin 55%", margin: "55%", rationale: "Potensi pertumbuhan lebih tinggi, tetapi margin ilustrasi 55% berada di bawah target contoh 60%. Opsi ini memerlukan tinjauan, bukan approval otomatis.", revenue: "Belum tersedia", additional: "Belum tersedia", confidence: "Belum tersedia" },
];
export const campaigns = [
  { id: "weekend", title: "Promo Akhir Pekan", status: "Deviasi", period: "11–13 Sep 2026 · Pusat Kota", impact: "+Rp 1,8 jt", note: "Deviasi −8,4% · Perlu ditinjau", actual: "Rp 19,2 jt", prediction: "Rp 21,0 jt", deviation: "−8,4%", profit: "Rp 0,62 jt" },
  { id: "lunch", title: "Paket Hemat Siang", status: "Sesuai target", period: "10–16 Sep 2026 · Semua outlet", impact: "+Rp 5,0 jt", note: "Deviasi +2,1% · Dalam batas", actual: "Belum tersedia", prediction: "Belum tersedia", deviation: "+2,1%", profit: "Belum tersedia" },
  { id: "afternoon", title: "Paket Kopi Sore", status: "Terjadwal", period: "14–20 Sep 2026", impact: "Rp 3,6 jt", note: "Semua 3 outlet", actual: "Belum ada data aktual", prediction: "Rp 27,6 jt", deviation: "Belum tersedia", profit: "Belum tersedia" },
];
export const completedCampaigns = [
  { id: "morning", title: "Kopi Pagi", status: "Selesai", period: "1–7 Sep 2026 · Semua outlet", impact: "+Rp 6,4 jt", note: "Kenaikan akhir +18,2%" },
  { id: "payday", title: "Promo Gajian", status: "Selesai", period: "25–31 Agu 2026 · Pusat Kota", impact: "+Rp 8,2 jt", note: "Kenaikan akhir +22,4%" },
  { id: "pastry", title: "Pekan Pastri", status: "Selesai", period: "18–24 Agu 2026 · Kampus", impact: "+Rp 4,8 jt", note: "Kenaikan akhir +14,1%" },
];
