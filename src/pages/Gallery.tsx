import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { publicImageUrl } from '../lib/storage';
import { KIND_LABELS, type PostKind, type PostWithMeta } from '../lib/types';

export default function Gallery() {
  const [posts, setPosts] = useState<PostWithMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeKind, setActiveKind] = useState<PostKind | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('posts_with_meta')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setPosts(data as PostWithMeta[]);
    })();
  }, []);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    posts?.forEach((p) => p.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (activeTag && !p.tags.includes(activeTag)) return false;
      if (activeKind && p.kind !== activeKind) return false;
      if (!needle) return true;
      const hay = `${p.title} ${p.reading ?? ''} ${p.poster_name} ${p.tags.join(' ')}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [posts, q, activeTag, activeKind]);

  if (error) return <div className="error">{error}</div>;
  if (!posts) return <div className="muted">読込中…</div>;

  return (
    <div>
      <div className="card">
        <div className="row">
          <input
            placeholder="🔍 タイトル・ふりがな・タグ・投稿者で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted">種別:</span>
          <span
            className={`chip ${activeKind === null ? 'active' : ''}`}
            onClick={() => setActiveKind(null)}
          >
            全部
          </span>
          {(Object.keys(KIND_LABELS) as PostKind[]).map((k) => (
            <span
              key={k}
              className={`chip ${activeKind === k ? 'active' : ''}`}
              onClick={() => setActiveKind(activeKind === k ? null : k)}
            >
              {KIND_LABELS[k]}
            </span>
          ))}
        </div>
        {tagCounts.length > 0 && (
          <div className="row" style={{ marginTop: 10 }}>
            <span className="muted">タグ:</span>
            {tagCounts.slice(0, 30).map(([t, c]) => (
              <span
                key={t}
                className={`chip ${activeTag === t ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
              >
                #{t} <span style={{ opacity: 0.6 }}>{c}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="muted" style={{ marginBottom: 8 }}>
        {filtered.length} 件 / 全 {posts.length} 件
      </div>

      {filtered.length === 0 ? (
        <div className="card center" style={{ minHeight: 200 }}>
          <div className="muted">まだ投稿がありません。「＋投稿」から最初の〇浜を登録しよう！</div>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((p) => (
            <Link key={p.id} to={`/post/${p.id}`} className="tile">
              <img src={publicImageUrl(p.image_path)} loading="lazy" alt={p.title} />
              {p.reaction_count > 0 && <span className="heart">❤ {p.reaction_count}</span>}
              <div className="caption">{p.title}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
