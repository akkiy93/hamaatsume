import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('posts').select('tags');
      const s = new Set<string>();
      (data ?? []).forEach((r: { tags: string[] }) => r.tags.forEach((t) => s.add(t)));
      setAllTags([...s].sort());
    })();
  }, []);

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t),
  );

  function add(t: string) {
    const clean = t.trim().replace(/^#/, '');
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setInput('');
    setOpen(false);
  }

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef}>
      <div className="row">
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(input); }
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="例: 駅名 看板 ラーメン"
          />
          {open && suggestions.length > 0 && (
            <div className="card" style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              zIndex: 30, padding: 4, marginTop: 2, maxHeight: 180, overflow: 'auto',
            }}>
              {suggestions.slice(0, 12).map((t) => (
                <div key={t}
                  onMouseDown={(e) => { e.preventDefault(); add(t); }}
                  style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  #{t}
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => add(input)}>追加</button>
      </div>
      <div style={{ marginTop: 6 }}>
        {tags.map((t) => (
          <span key={t} className="chip"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            title="クリックで削除">
            #{t} ✕
          </span>
        ))}
      </div>
    </div>
  );
}
