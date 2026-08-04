create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  ticket_balance int not null default 0 check (ticket_balance >= 0),
  created_at timestamptz not null default now()
);

create table public.prizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  weight int not null check (weight > 0),
  color text not null default '#B8934A',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prize_id uuid references public.prizes(id) on delete set null,
  prize_name_snapshot text not null,
  prize_weight_snapshot int not null,
  roll numeric not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references public.profiles(id)
);

create table public.ticket_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('signup_grant','spin_consume','admin_adjust','refund')),
  related_win_id uuid references public.wins(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index on public.wins (user_id, created_at desc);
create index on public.wins (status);
create index on public.ticket_transactions (user_id, created_at desc);
