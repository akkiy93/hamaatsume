import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session, login, loading } = useAuth();
  const [nickname, setNickname] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="center">読込中…</div>;
  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(nickname.trim().toLowerCase(), passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 340 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>🌊 浜あつめ</h2>
        <p className="muted">合言葉を知っている仲間だけで遊ぶ、〇浜コレクション。</p>
        <div className="col" style={{ marginTop: 16 }}>
          <div>
            <label>ニックネーム（半角英数 1-24）</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例: akki"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label>合言葉</label>
            <input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? '入場中…' : '入る'}
          </button>
        </div>
      </form>
    </div>
  );
}
