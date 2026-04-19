export type PostKind = 'place' | 'person' | 'shop' | 'other';

export const KIND_LABELS: Record<PostKind, string> = {
  place: '地名',
  person: '人名',
  shop: '店名',
  other: 'その他',
};

export interface Poster {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: string;
  owner_id: string;
  poster_id: string | null;
  title: string;
  reading: string | null;
  kind: PostKind | null;
  memo: string | null;
  image_path: string;
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  created_at: string;
}

export interface PostWithMeta extends Post {
  poster_name: string;
  reaction_count: number;
}
