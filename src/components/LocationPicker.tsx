import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 13));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);

  const center = useMemo<[number, number]>(
    () => (lat != null && lng != null ? [lat, lng] : [35.4437, 139.638]),
    [lat, lng],
  );

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=ja&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const data = (await res.json()) as NominatimHit[];
        setHits(data);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  function pick(h: NominatimHit) {
    onChange(Number(h.lat), Number(h.lon));
    setQuery(h.display_name);
    setHits([]);
  }

  async function useCurrent() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onChange(pos.coords.latitude, pos.coords.longitude);
    });
  }

  return (
    <div>
      <div className="row">
        <input
          placeholder="🔍 場所を検索（例: 横浜駅、長浜市）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="button" onClick={() => void useCurrent()}>
          📍 現在地
        </button>
        {lat != null && (
          <button type="button" onClick={() => onChange(null, null)}>
            クリア
          </button>
        )}
      </div>
      {hits.length > 0 && (
        <div
          className="card"
          style={{ padding: 6, marginTop: 4, marginBottom: 4, maxHeight: 180, overflow: 'auto' }}
        >
          {hits.map((h) => (
            <div
              key={h.place_id}
              onClick={() => pick(h)}
              style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 13, borderRadius: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {h.display_name}
            </div>
          ))}
        </div>
      )}
      {searching && <div className="muted">検索中…</div>}
      <div style={{ height: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer
          center={center}
          zoom={lat != null ? 13 : 9}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(a, b) => onChange(a, b)} />
          <Recenter lat={lat} lng={lng} />
          {lat != null && lng != null && (
            <Marker
              position={[lat, lng]}
              icon={ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  onChange(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        {lat != null && lng != null
          ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}（地図クリック or ピンをドラッグで調整）`
          : '地図をクリックするか、検索ボックスで場所を指定'}
      </div>
    </div>
  );
}
