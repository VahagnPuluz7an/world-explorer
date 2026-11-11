-- World Explorer: run this once in Supabase → SQL Editor
create table if not exists public.marks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('stroke','area','country')),
  color text not null,
  opacity real not null default 0.65,
  size real not null default 18,
  zoom real not null default 2,
  data jsonb not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists marks_user_idx on public.marks(user_id);
alter table public.marks enable row level security;
drop policy if exists "own marks select" on public.marks;
drop policy if exists "own marks insert" on public.marks;
drop policy if exists "own marks delete" on public.marks;
create policy "own marks select" on public.marks for select using (auth.uid() = user_id);
create policy "own marks insert" on public.marks for insert with check (auth.uid() = user_id);
create policy "own marks delete" on public.marks for delete using (auth.uid() = user_id);
