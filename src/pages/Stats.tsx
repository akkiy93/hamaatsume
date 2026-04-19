import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KIND_LABELS, type PostKind, type PostWithMeta } from '../lib/types';

export default function Stats() {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('posts_with_meta').select('*');
      setPosts((data ?? []) as PostWithMeta[]);
    })();
  }, []);

  const byKind = useMemo(() => {
    const m = new Map<PostKind | 'unset', number>();
    posts.forEach((p) => {
      const k = (p.kind ?? 'unset') as PostKind | 'unset';
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [posts]);

  const byPoster = useMemo(() => {
    const m = new Map<string, number>();
    posts.forEach((p) => m.set(p.poster_name, (m.get(p.poster_name) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const byTag = useMemo(() => {
    const m = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [posts]);

  const topReactions = useMemo(
    () => [...posts].sort((a, b) => b.reaction_count - a.reaction_count).slice(0, 5),
    [posts],
  );

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>📊 コレクション統計</h2>
        <div className="row" style={{ fontSize: 18 }}>
          <div>
            総投稿数: <b>{posts.length}</b>
          </div>
          <div>
            参加者: <b>{new Set(posts.map((p) => p.poster_name)).size}</b>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>種別ごと</h3>
        <div className="row">
          {(Object.keys(KIND_LABELS) as PostKind[]).map((k) => (
            <div key={k} style={{ minWidth: 80 }}>
              <div className="muted">{KIND_LABELS[k]}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{byKind.get(k) ?? 0}</div>
            </div>
          ))}
          {byKind.get('unset') ? (
            <div style={{ minWidth: 80 }}>
              <div className="muted">未分類</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{byKind.get('unset')}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h3>投稿者ランキング</h3>
        {byPoster.length === 0 && <div className="muted">まだ投稿がありません</div>}
        <ol>
          {byPoster.map(([name, c]) => (
            <li key={name}>
              {name} — {c} 件
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <h3>タグクラウド</h3>
        {byTag.length === 0 && <div className="muted">タグがまだありません</div>}
        <div>
          {byTag.map(([t, c]) => (
            <span key={t} className="chip" style={{ fontSize: 12 + Math.min(c, 8) }}>
              #{t} {c}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>❤️ 人気の投稿</h3>
        {topReactions.length === 0 && <div className="muted">まだリアクションがありません</div>}
        <ol>
          {topReactions.map((p) => (
            <li key={p.id}>
              {p.title} — {p.reaction_count}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
