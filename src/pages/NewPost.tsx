import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { compressImage } from '../lib/image';
import { uploadPhoto } from '../lib/storage';
import { KIND_LABELS, type PostKind, type Poster } from '../lib/types';

export default function NewPost() {
  const { session } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [reading, setReading] = useState('');
  const [kind, setKind] = useState<PostKind>('place');
  const [memo, setMemo] = useState('');
  const [takenAt, setTakenAt] = useState<string>('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [posterId, setPosterId] = useState<string>('');
  const [newPosterName, setNewPosterName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupWarn, setDupWarn] = useState<string | null>(null);

  const ownerId = session?.user.id;

  useEffect(() => {
    if (!ownerId) return;
    void (async () => {
      const { data } = await supabase
        .from('posters')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      setPosters((data ?? []) as Poster[]);
      if (data && data.length > 0) setPosterId((data[0] as Poster).id);
    })();
  }, [ownerId]);

  // Duplicate title warning (across all posts, not just owner)
  useEffect(() => {
    const t = title.trim();
    if (!t) {
      setDupWarn(null);
      return;
    }
    const ctrl = new AbortController();
    void (async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title')
        .eq('title', t)
        .limit(1)
        .abortSignal(ctrl.signal);
      if (data && data.length > 0) setDupWarn(`「${t}」は既に投稿されているかも`);
      else setDupWarn(null);
    })();
    return () => ctrl.abort();
  }, [title]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  async function useGeolocation() {
    if (!navigator.geolocation) {
      setError('この端末では位置情報を取得できません');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => setError(`位置情報エラー: ${err.message}`),
    );
  }

  async function ensurePosterId(): Promise<string | null> {
    if (!ownerId) return null;
    if (posterId === '__new__') {
      const name = newPosterName.trim();
      if (!name) {
        setError('新しい投稿者名を入力してください');
        return null;
      }
      const { data, error } = await supabase
        .from('posters')
        .insert({ owner_id: ownerId, name })
        .select()
        .single();
      if (error) {
        setError(error.message);
        return null;
      }
      return (data as Poster).id;
    }
    return posterId || null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ownerId) return;
    if (!file) {
      setError('写真を選んでください');
      return;
    }
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setBusy(true);
    try {
      const blob = await compressImage(file);
      const path = await uploadPhoto(ownerId, blob);
      const pid = await ensurePosterId();
      const { data, error } = await supabase
        .from('posts')
        .insert({
          owner_id: ownerId,
          poster_id: pid,
          title: title.trim(),
          reading: reading.trim() || null,
          kind,
          memo: memo.trim() || null,
          image_path: path,
          taken_at: takenAt || null,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          tags,
        })
        .select()
        .single();
      if (error) throw error;
      nav(`/post/${(data as { id: string }).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const posterOptions = useMemo(
    () => [
      ...posters.map((p) => ({ value: p.id, label: p.name })),
      { value: '__new__', label: '＋新しい投稿者名を作る' },
    ],
    [posters],
  );

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2 style={{ marginTop: 0 }}>新しい〇浜を投稿</h2>

      <div className="col">
        <div>
          <label>写真 *</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          {preview && (
            <img
              src={preview}
              alt="プレビュー"
              style={{
                marginTop: 8,
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 8,
                background: '#000',
              }}
            />
          )}
        </div>

        <div>
          <label>タイトル *（例: 横浜、長浜、浜崎）</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          {dupWarn && <div className="muted">💡 {dupWarn}</div>}
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>ふりがな</label>
            <input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="よこはま"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>種別</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
              {(Object.keys(KIND_LABELS) as PostKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label>投稿者名</label>
          <select value={posterId} onChange={(e) => setPosterId(e.target.value)}>
            <option value="">（選択なし）</option>
            {posterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {posterId === '__new__' && (
            <input
              style={{ marginTop: 6 }}
              placeholder="新しい投稿者名"
              value={newPosterName}
              onChange={(e) => setNewPosterName(e.target.value)}
            />
          )}
        </div>

        <div>
          <label>タグ（Enter/スペースで追加）</label>
          <div className="row">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="例: 駅名 看板 ラーメン"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={addTag}>
              追加
            </button>
          </div>
          <div style={{ marginTop: 6 }}>
            {tags.map((t) => (
              <span
                key={t}
                className="chip"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                title="クリックで削除"
              >
                #{t} ✕
              </span>
            ))}
          </div>
        </div>

        <div>
          <label>ひとことメモ</label>
          <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>撮影日</label>
            <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>緯度</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="35.4437" />
          </div>
          <div style={{ flex: 1 }}>
            <label>経度</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="139.638" />
          </div>
        </div>
        <div>
          <button type="button" onClick={() => void useGeolocation()}>
            📍 現在地を使う
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="row">
          <button type="button" onClick={() => nav(-1)}>
            キャンセル
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? '投稿中…' : '投稿する'}
          </button>
        </div>
      </div>
    </form>
  );
}
