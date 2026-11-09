-- =====================================================================
-- Nimba Atelier — schéma Supabase
-- À exécuter une fois dans l'éditeur SQL de votre projet Supabase.
-- Le script est rejouable (IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Projet',
  prompt text not null default '',
  html text not null default '',
  engine text not null default 'anthropic',
  -- 'site' = build de sites, 'video' = montage vidéo (storyboard + aperçu animé)
  kind text not null default 'site' check (kind in ('site', 'video')),
  storyboard jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

-- Migration des bases déjà créées avec la version précédente du schéma.
alter table public.projects add column if not exists kind text not null default 'site';
alter table public.projects add column if not exists storyboard jsonb;
do $$
begin
  alter table public.projects add constraint projects_kind_check
    check (kind in ('site', 'video'));
exception when duplicate_object then null;
end $$;

create table if not exists public.payments (
  reference text primary key,             -- clé d'idempotence du webhook
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  credits integer not null check (credits > 0),
  amount_fcfa integer not null check (amount_fcfa >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text,
  provider_ref text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security : lecture seule pour l'utilisateur.
-- Les écritures sensibles passent par les fonctions SECURITY DEFINER
-- appelées avec la clé service_role depuis le serveur Next.js.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.projects enable row level security;
alter table public.payments enable row level security;

drop policy if exists "profil visible par son proprietaire" on public.profiles;
create policy "profil visible par son proprietaire"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "transactions visibles par leur proprietaire" on public.credit_transactions;
create policy "transactions visibles par leur proprietaire"
  on public.credit_transactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "projets visibles par leur proprietaire" on public.projects;
create policy "projets visibles par leur proprietaire"
  on public.projects for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "paiements visibles par leur proprietaire" on public.payments;
create policy "paiements visibles par leur proprietaire"
  on public.payments for select to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Inscription : 3 crédits offerts (trigger sur auth.users)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 3)
  on conflict (id) do nothing;

  insert into public.credit_transactions (user_id, delta, reason)
  values (new.id, 3, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- updated_at automatique sur les projets
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Débit atomique d'un crédit. Renvoie NULL si le solde est insuffisant.
-- ---------------------------------------------------------------------
create or replace function public.consume_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  update public.profiles
     set credits = credits - 1
   where id = p_user_id and credits > 0
   returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, -1, 'generation');

  return v_credits;
end;
$$;

-- ---------------------------------------------------------------------
-- Remboursement si l'appel à l'IA échoue
-- ---------------------------------------------------------------------
create or replace function public.refund_credit(p_user_id uuid, p_reason text default 'generation_failed')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  update public.profiles
     set credits = credits + 1
   where id = p_user_id
   returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, 1, coalesce(p_reason, 'refund'));

  return v_credits;
end;
$$;

-- ---------------------------------------------------------------------
-- Confirmation de paiement IDEMPOTENTE : plusieurs webhooks pour la même
-- référence ne créditent le compte qu'une seule fois.
-- ---------------------------------------------------------------------
create or replace function public.confirm_payment(
  p_reference text,
  p_user_id uuid,
  p_credits integer,
  p_amount_fcfa integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied boolean := false;
begin
  -- Un seul UPDATE conditionnel : en cas de webhooks concurrents,
  -- un seul d'entre eux voit status = 'pending'.
  update public.payments
     set status = 'paid',
         confirmed_at = now(),
         credits = p_credits,
         amount_fcfa = p_amount_fcfa
   where reference = p_reference
     and user_id = p_user_id
     and status = 'pending'
   returning true into v_applied;

  if not coalesce(v_applied, false) then
    return false;
  end if;

  update public.profiles
     set credits = credits + p_credits
   where id = p_user_id;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, p_credits, 'purchase:' || p_reference);

  return true;
end;
$$;

-- Seul le serveur (service_role) peut modifier les soldes.
revoke all on function public.consume_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_payment(text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid) to service_role;
grant execute on function public.refund_credit(uuid, text) to service_role;
grant execute on function public.confirm_payment(text, uuid, integer, integer) to service_role;

-- ---------------------------------------------------------------------
-- Octroi de crédits par un administrateur (back-office /admin).
-- Atomique, journalisé, réservé au service_role. Montant borné à 100.
-- ---------------------------------------------------------------------
create or replace function public.grant_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  if p_amount is null or p_amount < 1 or p_amount > 100 then
    raise exception 'Montant de crédits invalide';
  end if;

  update public.profiles
     set credits = credits + p_amount
   where id = p_user_id
   returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, p_amount, 'admin_grant');

  return v_credits;
end;
$$;

revoke all on function public.grant_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, integer) to service_role;
