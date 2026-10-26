import { useEffect, useState } from "react";
import { api, workflowStates, type Decision, type DecisionResponse, type Health, type WorkflowState } from "../api/client";
import { Button, Card, Notice, SelectField } from "./ui";

export function HealthStatus() {
  const [retry, setRetry] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setHealth(null);
    api.health(controller.signal).then(data => { if (!controller.signal.aborted) setHealth(data); }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Health check gagal."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <section className="api-health" aria-label="Status API"><div role="status">{loading ? "Memeriksa health API…" : error ? error : `API merespons · status: ${health?.status} · environment: ${health?.environment}`}</div><p className="caption muted">Health bukan bukti database, LLM, sinkronisasi data, atau integrasi bisnis siap.</p><Button variant="secondary" disabled={loading} onClick={() => setRetry(retry + 1)}>Periksa ulang API</Button></section>;
}
export default function DecisionSandbox() {
  const [state, setState] = useState<WorkflowState>("pending_approval");
  const [decision, setDecision] = useState<Decision>("reject");
  const [approver, setApprover] = useState("");
  const [parameter, setParameter] = useState("max_discount");
  const [value, setValue] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResponse | null>(null);
  const [error, setError] = useState("");
  const blocked = !acknowledged || loading || (decision === "approve" && !approver.trim()) || (decision === "revise" && (!parameter.trim() || !value.trim()));
  return <Card title="Sandbox transisi keputusan · API nyata"><Notice tone="warning">Sandbox stateless, bukan persetujuan bisnis. approved_by hanyalah string; tidak mengautentikasi pengguna. Respons executing tidak menjalankan pekerjaan. event_id fondasi bukan ID campaign unik.</Notice><form className="stack" onSubmit={async event => {
    event.preventDefault(); if (blocked) return;
    setLoading(true); setResult(null); setError("");
    try { const response = await api.decision({ state, decision, ...(decision === "approve" ? { approved_by: approver.trim() } : {}), revision_parameters: decision === "revise" ? { [parameter.trim()]: value.trim() } : {} }); setResult(response); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Request gagal."); }
    finally { setLoading(false); }
  }}><div className="two-columns"><SelectField label="State request (bukan state server tersimpan)" value={state} options={[...workflowStates]} onChange={next => { setState(next as WorkflowState); setResult(null); }} /><SelectField label="Keputusan sandbox" value={decision} options={["reject","revise","approve"]} onChange={next => { setDecision(next as Decision); setResult(null); }} /></div>{decision === "approve" && <label className="field"><span>approved_by · label uji, bukan identitas login</span><input required value={approver} onChange={event => setApprover(event.target.value)} maxLength={100} autoComplete="off" /></label>}{decision === "revise" && <div className="two-columns"><label className="field"><span>Nama parameter revisi</span><input required value={parameter} onChange={event => setParameter(event.target.value)} maxLength={100} /></label><label className="field"><span>Nilai parameter (string)</span><input required value={value} onChange={event => setValue(event.target.value)} maxLength={300} /></label></div>}<label className="checkbox-label"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />Saya memahami ini hanya pengujian API fondasi, tanpa approval atau eksekusi bisnis.</label><Button type="submit" disabled={blocked}>{loading ? "Mengirim request…" : "Uji transisi fondasi"}</Button></form>{error && <Notice tone="error">{error} Tidak ada fallback demo.</Notice>}{result && <Notice><strong>Respons transisi diterima: {result.state}</strong><p>decision: {result.decision} · event_id: {result.event_id}</p><p>Tidak ada campaign dijalankan, approval disimpan, atau revisi strategi dihitung.</p></Notice>}</Card>;
}
