import type { Metric } from "../components/ui";

// Exact Figma fixtures only. No API data, business execution, or persistence.
export type CampaignId =
  "weekend" | "lunch" | "afternoon" | "morning" | "payday" | "pastry";
export type CampaignStatus =
  | "deviation"
  | "on-target"
  | "scheduled"
  | "adjusted"
  | "stopped"
  | "cancelled"
  | "completed";
export type OutletId = "city" | "campus" | "riverside";
export type TimelineEvent = { time: string; title: string; note: string };
export type MonitoringCampaign = {
  id: CampaignId;
  title: string;
  status: CampaignStatus;
  outlets: OutletId[];
  period: string;
  terms: string;
  impact: string;
  note: string;
  metrics: Metric[];
  narrative: { title: string; description: string; next: string };
  timeline: TimelineEvent[];
  nextReview: string;
};
export const statusLabels: Record<CampaignStatus, string> = {
  deviation: "Deviasi",
  "on-target": "Sesuai target",
  scheduled: "Terjadwal",
  adjusted: "Disesuaikan ✓",
  stopped: "Dihentikan",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};
export const outletLabels: Record<OutletId, string> = {
  city: "Pusat Kota",
  campus: "Kampus",
  riverside: "Riverside",
};
const allOutlets: OutletId[] = ["city", "campus", "riverside"];
export const monitoringCampaigns: MonitoringCampaign[] = [
  {
    id: "weekend",
    title: "Promo Akhir Pekan",
    status: "deviation",
    outlets: ["city"],
    period: "11–13 Sep 2026 · Pusat Kota",
    terms: "16.00–19.00 · Diskon 20% minuman pilihan",
    impact: "+Rp 1,8 jt",
    note: "Deviasi −8,4% · Perlu ditinjau",
    metrics: [
      {
        label: "Pendapatan aktual",
        value: "Rp 19,2 jt",
        note: "Actual · Selama periode promo",
      },
      {
        label: "Prediksi pendapatan",
        value: "Rp 21,0 jt",
        note: "Prediction · Estimasi awal",
      },
      {
        label: "Deviasi",
        value: "−8,4%",
        note: "Di bawah ekspektasi",
        tone: "danger",
      },
      {
        label: "Laba tambahan",
        value: "Rp 0,62 jt",
        note: "Di atas acuan tanpa promo",
      },
    ],
    narrative: {
      title: "Periode lebih singkat bisa lebih efektif",
      description:
        "Kunjungan setelah pukul 18.00 lebih rendah dari proyeksi. Promo masih menguntungkan, tetapi kenaikannya lebih kecil dari perkiraan.",
      next: "Ubah sisa periode promo ke pukul 16.00–18.00 dan fokus pada paket kopi.",
    },
    timeline: [
      {
        time: "13 Sep · 10.35",
        title: "Peringatan deviasi muncul",
        note: "Pendapatan aktual −8,4% di bawah prediksi",
      },
      {
        time: "12 Sep · 18.00",
        title: "Kinerja harian ditinjau",
        note: "Tanpa penyesuaian · Deviasi −3,1%",
      },
      {
        time: "11 Sep · 16.00",
        title: "Promo dimulai",
        note: "Outlet Pusat Kota · Promo 3 hari",
      },
      {
        time: "10 Sep · 14.20",
        title: "Disetujui Rainer",
        note: "Simulasi AI ditinjau · Risiko sedang",
      },
    ],
    nextReview: "Hari ini, 18.00",
  },
  {
    id: "lunch",
    title: "Paket Hemat Siang",
    status: "on-target",
    outlets: allOutlets,
    period: "10–16 Sep 2026 · Semua outlet",
    terms: "11.00–14.00 · Paket siang",
    impact: "+Rp 5,0 jt",
    note: "Deviasi +2,1% · Dalam batas",
    metrics: [
      {
        label: "Pendapatan aktual",
        value: "Rp 24,5 jt",
        note: "Actual · Selama periode promo",
      },
      {
        label: "Prediksi pendapatan",
        value: "Rp 24,0 jt",
        note: "Prediction · Estimasi awal",
      },
      { label: "Deviasi", value: "+2,1%", note: "Dalam batas pemantauan" },
      {
        label: "Laba tambahan",
        value: "Rp 1,45 jt",
        note: "Di atas acuan tanpa promo",
      },
    ],
    narrative: {
      title: "Kinerja promo siang sesuai target",
      description:
        "Paket Hemat Siang 2,1% di atas prediksi. Pertahankan periode promo dan tinjau stok untuk besok.",
      next: "Pertahankan strategi saat ini dan tinjau lagi pukul 18.00.",
    },
    // The source repeats the weekend timeline and chart. Do not attribute these to lunch.
    timeline: [],
    nextReview: "Hari ini, 18.00",
  },
  {
    id: "afternoon",
    title: "Paket Kopi Sore",
    status: "scheduled",
    outlets: allOutlets,
    period: "14–20 Sep 2026",
    terms: "14.00–17.00 · Kopi + pastri · Diskon 15%",
    impact: "Rp 3,6 jt",
    note: "Semua 3 outlet",
    metrics: [
      {
        label: "Proyeksi pendapatan",
        value: "Rp 27,6 jt",
        note: "Prediction · Dari simulasi yang disetujui",
      },
      {
        label: "Pendapatan tambahan",
        value: "Rp 3,6 jt",
        note: "Prediction · Dibanding nilai acuan",
      },
      {
        label: "Proyeksi margin",
        value: "64%",
        note: "Prediction · Estimasi yang disetujui",
      },
      {
        label: "Keyakinan",
        value: "82%",
        note: "Berdasarkan 90 hari penjualan",
      },
    ],
    narrative: {
      title: "Promo Anda sudah dijadwalkan",
      description:
        "Penawaran dan outlet mengikuti simulasi yang disetujui. Pemantauan dimulai saat promo berjalan.",
      next: "Kopi + pastri · Diskon 15% · Semua 3 outlet · 14.00–17.00",
    },
    timeline: [
      {
        time: "13 Sep · Baru saja",
        title: "Promo dijadwalkan",
        note: "Penawaran dan outlet tersimpan",
      },
      {
        time: "13 Sep · Simulasi",
        title: "Proyeksi ditinjau",
        note: "Penawaran dan margin dibanding acuan",
      },
      {
        time: "Periode promo",
        title: "Jadwal mendatang",
        note: "14–20 Sep 2026",
      },
      {
        time: "13 Sep · Rekomendasi AI",
        title: "Disetujui Rainer",
        note: "Paket sore dipilih",
      },
    ],
    nextReview: "Setelah periode promo pertama",
  },
  ...(
    [
      [
        "morning",
        "Kopi Pagi",
        "1–7 Sep 2026 · Semua outlet",
        "+Rp 6,4 jt",
        "Kenaikan akhir +18,2%",
        allOutlets,
      ],
      [
        "payday",
        "Promo Gajian",
        "25–31 Agu 2026 · Pusat Kota",
        "+Rp 8,2 jt",
        "Kenaikan akhir +22,4%",
        ["city"],
      ],
      [
        "pastry",
        "Pekan Pastri",
        "18–24 Agu 2026 · Kampus",
        "+Rp 4,8 jt",
        "Kenaikan akhir +14,1%",
        ["campus"],
      ],
    ] satisfies [CampaignId, string, string, string, string, OutletId[]][]
  ).map(([id, title, period, impact, note, outlets]): MonitoringCampaign => ({
    id,
    title,
    period,
    impact,
    note,
    outlets,
    status: "completed",
    terms: "Belum tersedia",
    metrics: [],
    timeline: [],
    nextReview: "Tidak ada · Promo selesai",
    narrative: {
      title: "Promo selesai",
      description:
        "Tinjau temuan tersimpan sebelum merencanakan promo berikutnya.",
      next: "Buka Memori AI",
    },
  })),
];
export type DemoCampaignState = { status: CampaignStatus; adjusted: boolean };
export function campaignSnapshot(
  campaign: MonitoringCampaign,
  state?: DemoCampaignState,
): MonitoringCampaign {
  if (!state) return campaign;
  let result = { ...campaign, status: state.status };
  if (campaign.id === "weekend" && state.adjusted) {
    result = {
      ...result,
      terms: "16.00–18.00 · Paket kopi",
      metrics: [
        campaign.metrics[0],
        {
          label: "Proyeksi terbaru",
          value: "Rp 19,7 jt",
          note: "Realtime Prediction · Ilustrasi sisa periode disesuaikan",
        },
        {
          label: "Estimasi deviasi",
          value: "−2,6%",
          note: "Proyeksi baru · Dalam batas",
        },
        campaign.metrics[3],
      ],
      narrative: {
        title: "Waktu lebih tepat, proyeksi lebih baik.",
        description:
          "Rekomendasi diterapkan. Sisa promo difokuskan pada jam ramai pukul 16.00–18.00. Hasil sebelumnya tetap tersimpan.",
        next: "Estimasi deviasi membaik menjadi −2,6% dengan proyeksi margin 63%. Tinjau setelah periode promo berikutnya.",
      },
      timeline: [
        {
          time: "13 Sep · 10.35",
          title: "Strategi diperbarui Rainer",
          note: "Saran AI diterapkan · Periode 16.00–18.00",
        },
        ...campaign.timeline.slice(1),
      ],
    };
  }
  if (state.status === "stopped" || state.status === "cancelled") {
    const cancelled = state.status === "cancelled";
    result = {
      ...result,
      nextReview: "Tidak ada · Sisa jadwal dibatalkan",
      narrative: {
        title: cancelled ? "Jadwal promo dibatalkan" : "Promo dihentikan",
        description: cancelled
          ? "Promo tidak akan berjalan. Parameter yang disetujui tetap tersimpan sebagai referensi."
          : "Sisa jadwal telah dibatalkan. Data pendapatan dan kinerja sebelumnya tetap tersedia.",
        next: "Tinjau hasil sebelumnya sebelum merencanakan promo berikutnya.",
      },
      timeline: [
        {
          time: "Demo · Baru saja",
          title: cancelled
            ? "Jadwal dibatalkan Rainer"
            : "Promo dihentikan Rainer",
          note: "Simulasi lokal · Hasil sebelumnya tetap tersedia",
        },
        ...result.timeline,
      ],
    };
  }
  return result;
}
export const recentMonitoringActivity = [
  {
    time: "10.48",
    title: "Paket Kopi Sore disetujui Rainer · Dijadwalkan 14 Sep",
    id: "afternoon",
  },
  {
    time: "10.35",
    title: "Deviasi Promo Akhir Pekan terdeteksi · −8,4%",
    id: "weekend",
  },
  {
    time: "09.00",
    title: "Paket Hemat Siang ditinjau · Sesuai target",
    id: "lunch",
  },
] satisfies { time: string; title: string; id: CampaignId }[];
export function monitoringChatLink(id?: CampaignId) {
  return `#chat?context=${id === "afternoon" ? "afternoon" : "weekend"}`;
}
