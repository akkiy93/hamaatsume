import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { compressImage } from '../lib/image';
import { deletePhoto, publicImageUrl, uploadPhoto } from '../lib/storage';
import { KIND_LABELS, type Post, type PostKind, type Poster } from '../lib/types';
import LocationPicker from '../components/LocationPicker';
import TagInput from '../components/TagInput';

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [reading, setReading] = useState('');
  const [kind, setKind] = useState<PostKind>('place');
  const [memo, setMemo] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [posterId, setPosterId] = useState('');
  const [newPosterName, setNewPosterName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerId = session?.user.id;

  useEffect(() => {
    if (!id || !ownerId) return;
    void (async () => {
      const [{ data: p }, { data: ps }] = await Promise.all([
        supabase.from('posts').select('*').eq('id', id).single(),
        supabase.from('posters').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      ]);
      if (!p) { nav('/'); return; }
      const post = p as Post;
      if (post.owner_id !== ownerId) { nav('/'); return; }
      setPost(post);
      setTitle(post.title);
      setReading(post.reading ?? '');
      setKind(post.kind ?? 'place');
      setMemo(post.memo ?? '');
      setTakenAt(post.taken_at ?? '');
      setLat(post.lat != null ? String(post.lat) : '');
      setLng(post.lng != null ? String(post.lng) : '');
      setTags(post.tags ?? []);
      setPosterId(post.poster_id ?? '');
      setPosters((ps ?? []) as Poster[]);
    })();
  }, [id, ownerId, nav]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function ensurePosterId(): Promise<string | null> {
    if (!ownerId) return null;
    if (posterId === '__new__') {
      const name = newPosterName.trim();
      if (!name) { setError('新しい投稿者名を入力してください'); return null; }
      const { data, error } = await supabase.from('posters').insert({ owner_id: ownerId, name }).select().single();
      if (error) { setError(error.message); return null; }
      return (data as Poster).id;
    }
    return posterId || null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ownerId || !post) return;
    if (!title.trim()) { setError('タイトルを入力してください'); return; }
    setBusy(true);
    try {
      let imagePath = post.image_path;
      if (file) {
        const blob = await compressImage(file);
        const newPath = await uploadPhoto(ownerId, blob);
        await deletePhoto(post.image_path);
        imagePath = newPath;
      }
      const pid = await ensurePosterId();
      const { error } = await supabase.from('posts').update({
        poster_id: pid,
        title: title.trim(),
        reading: reading.trim() || null,
        kind,
        memo: memo.trim() || null,
        image_path: imagePath,
        taken_at: takenAt || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        tags,
      }).eq('id', post.id);
      if (error) throw error;
      nav(`/post/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const posterOptions = useMemo(() => [
    ...posters.map((p) => ({ value: p.id, label: p.name })),
    { value: '__new__', label: '＋新しい投稿者名を作る' },
  ], [posters]);

  if (!post) return <div className="muted">読込中…</div>;

  const currentImg = preview ?? publicImageUrl(post.image_path);

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2 style={{ marginTop: 0 }}>投稿を編集</h2>
      <div className="col">
        <div>
          <label>写真（変更する場合のみ選択）</label>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
          <img src={currentImg} alt="現在の写真"
            style={{ marginTop: 8, width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8, background: '#000' }} />
        </div>

        <div>
          <label>タイトル *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>ふりがな</label>
            <input value={reading} onChange={(e) => setReading(e.target.value)} placeholder="よこはま" />
          </div>
          <div style={{ flex: 1 }}>
            <label>種別</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
              {(Object.keys(KIND_LABELS) as PostKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label>投稿者名</label>
          <select value={posterId} onChange={(e) => setPosterId(e.target.value)}>
            <option value="">（選択なし）</option>
            {posterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {posterId === '__new__' && (
            <input style={{ marginTop: 6 }} placeholder="新しい投稿者名"
              value={newPosterName} onChange={(e) => setNewPosterName(e.target.value)} />
          )}
        </div>

        <div>
          <label>タグ</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div>
          <label>ひとことメモ</label>
          <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        <div>
          <label>撮影日</label>
          <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </div>

        <div>
          <label>場所（任意）</label>
          <LocationPicker
            lat={lat === '' ? null : Number(lat)}
            lng={lng === '' ? null : Number(lng)}
            onChange={(a, b) => { setLat(a == null ? '' : String(a)); setLng(b == null ? '' : String(b)); }}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="row">
          <button type="button" onClick={() => nav(`/post/${post.id}`)}>キャンセル</button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? '保存中…' : '保存する'}
          </button>
        </div>
      </div>
    </form>
  );
}
