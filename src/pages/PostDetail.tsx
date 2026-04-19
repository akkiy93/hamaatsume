import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { deletePhoto, publicImageUrl } from '../lib/storage';
import { KIND_LABELS, type PostWithMeta } from '../lib/types';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const nav = useNavigate();
  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ownerId = session?.user.id;

  async function refresh() {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts_with_meta')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setPost(data as PostWithMeta);
    if (ownerId) {
      const { data: r } = await supabase
        .from('reactions')
        .select('emoji')
        .eq('post_id', id)
        .eq('owner_id', ownerId)
        .maybeSingle();
      setMyReaction((r as { emoji: string } | null)?.emoji ?? null);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ownerId]);

  async function toggleReaction(emoji: string) {
    if (!ownerId || !id) return;
    setBusy(true);
    try {
      if (myReaction === emoji) {
        await supabase.from('reactions').delete().eq('post_id', id).eq('owner_id', ownerId);
      } else {
        await supabase
          .from('reactions')
          .upsert(
            { post_id: id, owner_id: ownerId, emoji },
            { onConflict: 'post_id,owner_id' },
          );
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!post || !ownerId) return;
    if (!confirm('この投稿を削除しますか？')) return;
    setBusy(true);
    try {
      await supabase.from('posts').delete().eq('id', post.id);
      await deletePhoto(post.image_path);
      nav('/');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="error">{error}</div>;
  if (!post) return <div className="muted">読込中…</div>;

  const isOwner = ownerId === post.owner_id;
  const emojis = ['❤️', '👍', '🤣', '😻', '🌊'];

  return (
    <div className="card">
      <img className="detail-img" src={publicImageUrl(post.image_path)} alt={post.title} />
      <h2 style={{ marginBottom: 4 }}>
        {post.title}
        {post.kind && <span className="kind-tag">{KIND_LABELS[post.kind]}</span>}
      </h2>
      {post.reading && <div className="muted">{post.reading}</div>}
      <div className="row" style={{ marginTop: 8 }}>
        <span className="muted">投稿者: {post.poster_name}</span>
        {post.taken_at && <span className="muted">· 撮影 {post.taken_at}</span>}
        <span className="muted">· {new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      {post.memo && <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{post.memo}</p>}
      {post.tags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {post.tags.map((t) => (
            <span key={t} className="chip">
              #{t}
            </span>
          ))}
        </div>
      )}
      {post.lat != null && post.lng != null && (
        <div className="muted" style={{ marginTop: 8 }}>
          📍 {post.lat.toFixed(4)}, {post.lng.toFixed(4)}
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        {emojis.map((e) => (
          <button
            key={e}
            disabled={busy}
            onClick={() => void toggleReaction(e)}
            className={myReaction === e ? 'primary' : ''}
          >
            {e}
          </button>
        ))}
        <span className="muted" style={{ marginLeft: 8 }}>
          ❤ {post.reaction_count}
        </span>
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button onClick={() => nav('/')}>← 図鑑に戻る</button>
        {isOwner && (
          <button className="danger" onClick={() => void remove()} disabled={busy}>
            削除
          </button>
        )}
      </div>
    </div>
  );
}
