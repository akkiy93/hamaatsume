import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { publicImageUrl } from '../lib/storage';
import type { PostWithMeta } from '../lib/types';

// Leaflet's default marker icons ship as static assets that the bundler can't
// see through `import.meta.url` when running from a subpath. Set them to known
// CDN URLs so they render on GitHub Pages too.
const ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function MapView() {
  const [posts, setPosts] = useState<PostWithMeta[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('posts_with_meta')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      setPosts((data ?? []) as PostWithMeta[]);
    })();
  }, []);

  const center: [number, number] = posts.length
    ? [posts[0].lat as number, posts[0].lng as number]
    : [35.4437, 139.638]; // 横浜 default

  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        📍 位置情報付きの投稿: {posts.length} 件
      </div>
      <div className="map">
        <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {posts.map((p) => (
            <Marker key={p.id} position={[p.lat as number, p.lng as number]} icon={ICON}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <Link to={`/post/${p.id}`}>
                    <img
                      src={publicImageUrl(p.image_path)}
                      alt={p.title}
                      style={{ width: '100%', borderRadius: 6 }}
                    />
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{p.title}</div>
                  </Link>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{p.poster_name}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
