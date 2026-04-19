-- ============================================================
-- hamaatsume: Supabase schema
-- ============================================================
-- This file is idempotent: safe to run multiple times.
-- Run in Supabase SQL Editor (or via `supabase db push`).

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Tables ----------

-- 投稿者プロフィール（合言葉ログインしたユーザーが任意の表示名を作る）
-- auth.users の UID に紐づく。一人が複数の「名義」を持てるようにするため別テーブル。
create table if not exists public.posters (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, name)
);

-- 投稿（写真 + メタデータ）
create table if not exists public.posts (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  poster_id   uuid references public.posters(id) on delete set null,
  title       text not null,
  reading     text,                  -- ふりがな（例: よこはま）
  kind        text,                  -- 'place' | 'person' | 'shop' | 'other'
  memo        text,
  image_path  text not null,         -- storage path: posts/{owner_id}/{uuid}.jpg
  taken_at    date,
  lat         double precision,
  lng         double precision,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_title_idx on public.posts (title);
create index if not exists posts_tags_idx on public.posts using gin (tags);

-- いいね / スタンプ（1 ユーザー 1 投稿 1 リアクション）
create table if not exists public.reactions (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  emoji       text not null default '❤️',
  created_at  timestamptz not null default now(),
  unique (post_id, owner_id)
);

create index if not exists reactions_post_id_idx on public.reactions (post_id);

-- ---------- RLS ----------
alter table public.posters   enable row level security;
alter table public.posts     enable row level security;
alter table public.reactions enable row level security;

-- posters: 全員参照可、自分のだけ作成/更新/削除
drop policy if exists "posters read"   on public.posters;
drop policy if exists "posters insert" on public.posters;
drop policy if exists "posters update" on public.posters;
drop policy if exists "posters delete" on public.posters;
create policy "posters read"   on public.posters for select using (auth.role() = 'authenticated');
create policy "posters insert" on public.posters for insert with check (auth.uid() = owner_id);
create policy "posters update" on public.posters for update using (auth.uid() = owner_id);
create policy "posters delete" on public.posters for delete using (auth.uid() = owner_id);

-- posts: 認証済みは全員読める、自分の投稿だけ書ける
drop policy if exists "posts read"   on public.posts;
drop policy if exists "posts insert" on public.posts;
drop policy if exists "posts update" on public.posts;
drop policy if exists "posts delete" on public.posts;
create policy "posts read"   on public.posts for select using (auth.role() = 'authenticated');
create policy "posts insert" on public.posts for insert with check (auth.uid() = owner_id);
create policy "posts update" on public.posts for update using (auth.uid() = owner_id);
create policy "posts delete" on public.posts for delete using (auth.uid() = owner_id);

-- reactions: 認証済みは読める、自分のだけ書ける
drop policy if exists "reactions read"   on public.reactions;
drop policy if exists "reactions insert" on public.reactions;
drop policy if exists "reactions delete" on public.reactions;
create policy "reactions read"   on public.reactions for select using (auth.role() = 'authenticated');
create policy "reactions insert" on public.reactions for insert with check (auth.uid() = owner_id);
create policy "reactions delete" on public.reactions for delete using (auth.uid() = owner_id);

-- ---------- Storage ----------
-- Bucket: 'photos' (public read, authenticated write)
-- Create the bucket via dashboard or:
--   insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
--   on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos insert" on storage.objects;
drop policy if exists "photos delete" on storage.objects;

create policy "photos read" on storage.objects
  for select using (bucket_id = 'photos');

create policy "photos insert" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos delete" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- Views ----------
-- 投稿一覧 + いいね数 + 投稿者名（結合済み）
create or replace view public.posts_with_meta as
select
  p.*,
  coalesce(pr.name, '名無し') as poster_name,
  coalesce((select count(*) from public.reactions r where r.post_id = p.id), 0) as reaction_count
from public.posts p
left join public.posters pr on pr.id = p.poster_id;
