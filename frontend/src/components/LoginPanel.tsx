import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { Button, Card, Notice } from "./ui";

export default function LoginPanel({
  pending: _pending,
  onSignIn,
}: {
  pending?: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await onSignIn(email, password);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Gagal masuk. Periksa koneksi backend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Masuk ke mode API nyata"
      subtitle="Kredensial dikirim ke /api/v1/auth/login. Token disimpan hanya di sessionStorage tab ini."
      className="login-panel"
    >
      <form onSubmit={submit} className="login-form" noValidate>
        <label htmlFor={emailId} className="field">
          <span>Email</span>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label htmlFor={passwordId} className="field">
          <span>Kata sandi</span>
          <input
            id={passwordId}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? "Memproses…" : "Masuk"}
        </Button>
      </form>
      <p className="caption muted">
        Belum punya akun? Akun dibuat oleh admin organisasi melalui backend. Tidak ada akun demo
        otomatis di mode API nyata.
      </p>
    </Card>
  );
}
