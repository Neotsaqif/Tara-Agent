import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type Health = { status: string; environment: string };

function App() {
  const [objective, setObjective] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend health check failed");
        return response.json() as Promise<Health>;
      })
      .then((data) => { setHealth(data); setStatus("success"); })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="shell">
      <header className="header">
        <div><p className="eyebrow">TARA AGENT</p><h1>Business signals to executable decisions.</h1></div>
        <span className={`status ${status}`}>{status === "success" ? `Backend ${health?.environment}` : status === "loading" ? "Connecting..." : "Backend unavailable"}</span>
      </header>
      <section className="grid">
        <article className="card primary"><p className="eyebrow">Business objective</p><h2>What decision needs attention?</h2><textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Contoh: tingkatkan omzet outlet Kemang tanpa menurunkan margin di bawah 55%." /><button disabled={!objective.trim()} onClick={() => setObjective(objective.trim())}>Save objective</button></article>
        <article className="card"><p className="eyebrow">Workflow</p><h2>Foundation status</h2><ul><li>Informational · ready for deterministic queries</li><li>Diagnostic · foundation</li><li>Goal-Directed · state skeleton</li><li>External LLM · mock mode</li></ul></article>
      </section>
      <footer>API: {API_BASE_URL} · No production data or external action is enabled.</footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
