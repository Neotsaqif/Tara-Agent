import { useState } from "react";
import { navigate, type Mode } from "../App";
import { asset, Button, Card, EmptyState, Icon, Metrics, PageHeading } from "../components/ui";
import { BarChart, LineChart } from "../components/Charts";
import { HealthStatus } from "../components/ApiFoundation";
import { categories, days, heatmap, overviewMetrics, products } from "../data/demo";

export function Insight({ title, children, onClick }: { title: string; children: string; onClick?: () => void }) {
  return <section className="insight"><Icon name="IconSpark" /><h2>{title}</h2><p>{children}</p><button className="text-button" onClick={onClick ?? (() => navigate("Chat AI"))}>Analisis dengan AI →</button></section>;
}
export default function Overview({ mode }: { mode: Mode }) {
  const [category, setCategory] = useState<string | null>(null);
  const [cell, setCell] = useState<string | null>(null);
  return <><PageHeading title="Sekilas kinerja bisnis Anda" subtitle={mode === "demo" ? "Minggu, 13 September 2026 · Kinerja baik di ketiga outlet" : "Hubungkan data bisnis untuk melihat kinerja terverifikasi."}><Button onClick={() => navigate("Chat AI")}>Tanya AI</Button></PageHeading>
    {mode === "live" && <HealthStatus />}
    {mode === "live" ? <EmptyState title="Data bisnis belum tersedia">API ringkasan, penjualan, dan outlet belum tersedia. Pilih Demo Figma untuk meninjau desain dengan data ilustrasi, bukan sebagai pengganti kegagalan API.</EmptyState> : <>
      <Metrics items={overviewMetrics} />
      <div className="dashboard-primary"><LineChart title="Tren pendapatan" subtitle="1–13 September 2026 · Juta rupiah" /><div className="stack"><Insight title="Tingkatkan penjualan sore">Penjualan sore 18% di bawah rata-rata harian. Paket kopi + pastri dapat meningkatkan pendapatan.</Insight><Card className="alert-card"><h3>1 promo perlu perhatian</h3><p className="muted">Promo Akhir Pekan 8,4% di bawah prediksi. Tinjau sebelum pukul 18.00.</p><button className="text-button" onClick={() => { location.hash = "monitoring/weekend"; }}>Tinjau promo →</button></Card></div></div>
      <div className="two-columns"><BarChart /><Card title="Kontribusi pendapatan" subtitle="Per kategori produk · Hari ini"><div className="donut-content"><div className="donut" role="img" aria-label="Kontribusi ilustrasi: Kopi 48%, Makanan 28%, Nonkopi 16%, Pastri 8%"><img className="donut-coffee" src={asset("Coffee48")} alt="" /><img className="donut-food" src={asset("Food28")} alt="" /><img className="donut-noncoffee" src={asset("NonCoffee16")} alt="" /><img className="donut-pastry" src={asset("Pastry8")} alt="" /><div className="donut-total"><strong>Rp 24,8 jt</strong><span>TOTAL PENDAPATAN</span></div></div><div className="category-list">{categories.map(item => <button key={item.name} aria-pressed={category === item.name} onClick={() => setCategory(category === item.name ? null : item.name)}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.percent}%</strong></button>)}</div></div>{category && <p className="caption muted" role="status">{category}: kontribusi data demo. Buka Analitik untuk rincian ilustrasi.</p>}</Card></div>
      <div className="dashboard-bottom"><Card title="Produk teratas" subtitle="Urutan pendapatan · Hari ini">{products.map((product, index) => <div className="product-rank" key={product.name}><div><span className="muted">0{index + 1}</span><strong>{product.name}</strong><span className="muted">{product.amount}</span></div><div className="product-progress" style={{ width: `${product.percent}%` }} /></div>)}</Card><Card title="Kenali jam tersibuk" subtitle="Transaksi per hari dan jam · 7 hari terakhir"><div className="heatmap" role="group" aria-label="Jam tersibuk, data ilustrasi"><span />{["08", "10", "12", "14", "16", "18", "20", "22"].map(hour => <span className="heat-label" key={hour}>{hour}</span>)}{heatmap.map((row, day) => <div className="heat-row" key={days[day]}><span className="heat-label">{days[day]}</span>{row.map((value, hour) => <button key={hour} aria-label={`${days[day]} pukul ${8 + hour * 2}.00: ${value} transaksi ilustrasi`} title={`${value} transaksi ilustrasi`} style={{ background: value < 30 ? "var(--tint)" : value < 50 ? "var(--soft-blue)" : value < 70 ? "var(--blue-mid)" : value < 100 ? "var(--primary)" : "var(--navy)" }} onClick={() => setCell(`${days[day]} ${8 + hour * 2}.00 · ${value} transaksi ilustrasi`)} />)}</div>)}</div><p className="caption muted" role="status">{cell ?? "Sepi ░ ▒ ▓ Ramai · Puncak: Sabtu 18.00"}</p></Card></div>
    </>}
  </>;
}
