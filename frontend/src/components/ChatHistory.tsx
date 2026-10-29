import { useState } from "react";
import { Chevron } from "./Chevron";
import type { Mode } from "../App";
import { chatFixtures, chatHref, type ChatContext } from "../data/chat-demo";
import "../styles/pages/chat-prototype.css";

const history: { context: ChatContext; title: string; group: string }[] = [
  {
    context: "afternoon",
    title: "Tingkatkan penjualan sore",
    group: "Disematkan",
  },
  {
    context: "weekend",
    title: "Tinjau promo akhir pekan",
    group: "7 hari sebelumnya",
  },
  {
    context: "margin",
    title: "Tingkatkan margin produk",
    group: "7 hari sebelumnya",
  },
  {
    context: "seasonal",
    title: "Rencanakan bulan depan",
    group: "7 hari sebelumnya",
  },
];
export default function ChatHistory({ mode }: { mode: Mode }) {
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const list = all
    ? [
        ...history,
        ...(["products", "customers", "outlets", "memory"] as const).map(
          (context) => ({
            context,
            title: chatFixtures[context].title,
            group: "Snapshot demo",
          }),
        ),
      ]
    : history;
  const filtered = list.filter((item) =>
    item.title
      .toLocaleLowerCase("id")
      .includes(search.trim().toLocaleLowerCase("id")),
  );
  return (
    <div className="chat-history-prototype">
      <a className="chat-new" href="#chat">
        + Chat baru
      </a>
      <details className="conversation-history" open>
        <summary className="disclosure-toggle">
          <Chevron />
          <span>Percakapan</span>
        </summary>
        {mode === "demo" ? (
          <>
            <label className="chat-history-search">
              <span className="sr-only">Cari chat</span>
              <svg
                className="chat-search-icon"
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  cx="8.5"
                  cy="8.5"
                  r="5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m13 13 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari chat"
              />
            </label>
            <p className="chat-history-note">
              Riwayat ilustrasi, bukan percakapan tersimpan.
            </p>
            {filtered.map((item, index) => (
              <div key={item.context}>
                {(index === 0 || filtered[index - 1].group !== item.group) && (
                  <p className="chat-history-group">{item.group}</p>
                )}
                <a href={chatHref(item.context)}>{item.title}</a>
              </div>
            ))}
            {!filtered.length && (
              <p className="caption muted">Tidak ada percakapan yang cocok.</p>
            )}
            <button
              className="text-button chat-history-all"
              onClick={() => setAll(!all)}
            >
              {all ? "Tampilkan lebih sedikit" : "Lihat semua percakapan"}
            </button>
          </>
        ) : (
          <p className="caption muted">Riwayat belum tersimpan di server.</p>
        )}
      </details>
    </div>
  );
}
