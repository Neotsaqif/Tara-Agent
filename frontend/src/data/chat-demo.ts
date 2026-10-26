// Hand-authored Figma snapshots. No LLM requests or generated recommendations.
export const chatContexts = [
  "afternoon",
  "products",
  "customers",
  "outlets",
  "margin",
  "seasonal",
  "weekend",
  "memory",
] as const;
export type ChatContext = (typeof chatContexts)[number];
export type ChatOption = "A" | "B" | "C";
const rationale =
  "Dalam 4 promo terakhir, paket menaikkan nilai pesanan 14%. Margin kopi dan pastri masih memberi ruang untuk diskon ringan.";
export const chatFixtures: Record<
  ChatContext,
  {
    title: string;
    prompt: string;
    response: string;
    rationaleTitle: string;
    rationale: string;
    sourceNode?: string;
  }
> = {
  afternoon: {
    title: "Tingkatkan penjualan sore",
    prompt:
      "Promo mana yang paling efektif untuk meningkatkan penjualan sore tanpa terlalu menurunkan margin?",
    response:
      "Pendapatan pukul 14.00–17.00 masih 18% di bawah rata-rata harian. Dari transaksi dan promo sebelumnya, tiga pilihan ini layak diuji.",
    rationaleTitle: "Mengapa A unggul",
    rationale,
    sourceNode: "187:1593",
  },
  products: {
    title: "Tingkatkan kinerja produk",
    prompt:
      "Produk mana yang perlu dipromosikan untuk menaikkan pendapatan sambil menjaga margin?",
    response:
      "Kopi menyumbang 48% pendapatan. Padukan kopi bermargin tinggi dengan pastri untuk menaikkan nilai pesanan sebelum mendiskon makanan.",
    rationaleTitle: "Mengapa A unggul",
    rationale,
    sourceNode: "190:2264",
  },
  customers: {
    title: "Tingkatkan loyalitas pelanggan",
    prompt: "Segmen pelanggan mana yang paling berpotensi tumbuh?",
    response:
      "Pelanggan sesekali punya potensi pertumbuhan terbesar. Dorong kunjungan ulang dari pelanggan yang baru sekali datang dalam 30 hari terakhir.",
    rationaleTitle: "Poin loyalitas mendorong kunjungan ulang",
    rationale:
      "Tingkat kunjungan ulang pelanggan sesekali adalah 38%. Poin loyalitas ganda mendorong mereka kembali tanpa mengubah harga menu.",
    sourceNode: "190:2412",
  },
  outlets: {
    title: "Tingkatkan kinerja outlet",
    prompt: "Bagaimana cara meningkatkan kinerja seluruh outlet?",
    response:
      "Pusat Kota unggul dalam pendapatan, sementara Kampus masih berpotensi tumbuh. Uji paket sore di satu outlet sebelum menerapkannya di ketiga outlet.",
    rationaleTitle: "Mengapa A unggul",
    rationale,
    sourceNode: "190:2560",
  },
  margin: {
    title: "Jaga margin kotor",
    prompt: "Mengapa margin kotor turun minggu ini?",
    response:
      "Margin makanan masih di bawah target 60%. Tinjau porsi dan harga pemasok, lalu utamakan paket kopi dan poin loyalitas daripada diskon menyeluruh.",
    rationaleTitle: "Mengapa A unggul",
    rationale,
    sourceNode: "190:2708",
  },
  seasonal: {
    title: "Siapkan akhir pekan gajian",
    prompt: "Apa yang perlu disiapkan untuk akhir pekan gajian berikutnya?",
    response:
      "Tambah stok kopi dan pastri menjelang akhir pekan gajian. Sesuaikan jumlah staf pada sore hari dan uji promo paket dengan diskon terukur.",
    rationaleTitle: "Mengapa A unggul",
    rationale,
    sourceNode: "190:2856",
  },
  weekend: {
    title: "Tinjau promo akhir pekan",
    prompt: "Tinjau promo akhir pekan",
    response: "",
    rationaleTitle: "",
    rationale: "",
  },
  memory: {
    title: "Tinjau memori bisnis",
    prompt: "Tinjau memori bisnis",
    response: "",
    rationaleTitle: "",
    rationale: "",
  },
};
export function readChatRoute(hash: string) {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const value = params.get("context");
  const context: ChatContext = chatContexts.includes(value as ChatContext)
    ? (value as ChatContext)
    : "afternoon";
  const selected = params.get("option");
  const option = ["A", "B", "C"].includes(selected ?? "")
    ? (selected as ChatOption)
    : null;
  const simulation = /^chat\/simulation\/([ABC])$/.exec(path)?.[1] as
    ChatOption | undefined;
  return { context, option, simulation, offer: params.get("offer") };
}
export function chatHref(context: ChatContext, option?: string | null) {
  const params = new URLSearchParams({ context });
  if (option) params.set("option", option);
  return `#chat?${params}`;
}
export function simulationHref(context: ChatContext, option: string) {
  return `#chat/simulation/${option}?context=${context}`;
}
