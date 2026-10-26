import { useState } from "react";
import { asset, Card } from "./ui";
import { days } from "../data/demo";

export function LineChart({
  title,
  subtitle,
  series = "PrimarySeries",
  secondary,
  labels = [
    "01 Sep",
    "03 Sep",
    "05 Sep",
    "07 Sep",
    "09 Sep",
    "11 Sep",
    "13 Sep",
  ],
  legend = "Pendapatan",
  max = 30,
}: {
  title: string;
  subtitle: string;
  series?: string;
  secondary?: string;
  labels?: string[];
  legend?: string;
  max?: number;
}) {
  const [point, setPoint] = useState<number | null>(null);
  const points =
    series === "PrimarySeries"
      ? [
          { date: "01 Sep", value: "Rp 13,2 jt", note: "+4,2%" },
          { date: "07 Sep", value: "Rp 21,4 jt", note: "+8,1%" },
          { date: "13 Sep", value: "Rp 28,4 jt", note: "+12,4%" },
        ]
      : null;
  return (
    <Card title={title} subtitle={subtitle} className="chart-card">
      <div
        className={`line-chart ${series === "PrimarySeries" ? "overview-line" : "full-line"}`}
        role="group"
        aria-label={`${title}, data ilustrasi`}
      >
        <div className="chart-grid">
          {[max, (max * 2) / 3, max / 3, 0].map((value) => (
            <div className="grid-row" key={value}>
              <span>{Math.round(value)}</span>
              <i />
            </div>
          ))}
        </div>
        <div className="series-area">
          <img
            src={asset(series)}
            style={{
              height:
                series === "PrimarySeries"
                  ? 82.44
                  : series.startsWith("Simulation")
                    ? 124.45
                    : 101.23,
            }}
            alt="Tren ilustrasi dari desain Figma"
          />
          {secondary && (
            <img
              className="secondary-series"
              style={{
                height: secondary.startsWith("Simulation") ? 109.05 : 110.29,
              }}
              src={asset(secondary)}
              alt="Nilai acuan ilustrasi"
            />
          )}
        </div>
        <div className="chart-ticks">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="chart-hitpoints">
          {[0, 3, 6].map((index, position) => (
            <button
              key={index}
              aria-label={`Lihat titik ${labels[index]}`}
              onFocus={() => setPoint(position)}
              onMouseEnter={() => setPoint(position)}
              onMouseLeave={() => setPoint(null)}
              onBlur={() => setPoint(null)}
              onClick={() => setPoint(position)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setPoint(null);
              }}
            />
          ))}
        </div>
        {point !== null && (
          <output className="chart-tooltip">
            {points ? (
              <>
                <strong>{points[point].date}</strong>
                <span>{points[point].value}</span>
                <span className="success">
                  {points[point].note} dari periode sebelumnya
                </span>
                <small>Data ilustrasi Figma</small>
              </>
            ) : (
              <>
                {labels[[0, 3, 6][point]]} · Nilai titik belum tersedia; grafik
                ilustrasi
              </>
            )}
          </output>
        )}
      </div>
      <p className="chart-legend">
        ● {legend}
        {secondary && <span className="muted"> · ┄ Nilai acuan</span>}
      </p>
    </Card>
  );
}
export function BarChart({
  title = "Kinerja mingguan",
  subtitle = "7–13 September · Juta rupiah",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [point, setPoint] = useState<number | null>(null);
  const points = [
    { date: "07 Sep", value: "Rp 18,8 jt", note: "+4,2%" },
    { date: "10 Sep", value: "Rp 22,5 jt", note: "+8,1%" },
    { date: "13 Sep", value: "Rp 24,8 jt", note: "+12,4%" },
  ];
  return (
    <Card title={title} subtitle={subtitle} className="chart-card">
      <div className="bar-chart">
        <div className="chart-grid">
          {[30, 20, 10, 0].map((value) => (
            <div className="grid-row" key={value}>
              <span>{value}</span>
              <i />
            </div>
          ))}
        </div>
        <div className="bars">
          {[65, 83, 72, 102, 113, 144, 126].map((height, index) => (
            <div key={days[index]}>
              <button
                title={`${days[index]} · Kinerja ilustrasi`}
                aria-label={`${days[index]}, lihat rincian ilustrasi`}
                onFocus={() => setPoint([0, 3, 6].indexOf(index))}
                onMouseEnter={() => setPoint([0, 3, 6].indexOf(index))}
                onBlur={() => setPoint(null)}
                onMouseLeave={() => setPoint(null)}
                onClick={() => setPoint([0, 3, 6].indexOf(index))}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setPoint(null);
                }}
                style={{
                  height,
                  background:
                    index === 5 ? "var(--primary)" : "var(--soft-blue)",
                }}
              />
              <span>{days[index]}</span>
            </div>
          ))}
        </div>
        {point !== null && (
          <output className="chart-tooltip">
            {point >= 0 ? (
              <>
                <strong>{points[point].date}</strong>
                <span>{points[point].value}</span>
                <span className="success">
                  {points[point].note} dari periode sebelumnya
                </span>
                <small>Data ilustrasi Figma</small>
              </>
            ) : (
              <>Nilai titik belum tersedia; grafik ilustrasi</>
            )}
          </output>
        )}
      </div>
      <p className="chart-legend">● Pendapatan</p>
    </Card>
  );
}
