-- Migration appliquée au projet Supabase jyyqgymkxfqirgzeyjcw le 2026-11-09.
-- Passage de la tarification FCFA -> GNF / $ (1 $ ≈ 8 650 GNF).
-- Idempotente : à exécuter une seule fois sur une base créée par schema.sql
-- d'avant cette migration (colonne amount_fcfa et fonction p_amount_fcfa).

alter table public.payments rename column amount_fcfa to amount_gnf;

do $$
begin
  alter table public.payments rename constraint payments_amount_fcfa_check to payments_amount_gnf_check;
exception when undefined_object then null;
end $$;

-- Le nom d'un paramètre ne peut pas être renommé : on recrée la fonction.
drop function if exists public.confirm_payment(text, uuid, integer, integer);

create function public.confirm_payment(
  p_reference text,
  p_user_id uuid,
  p_credits integer,
  p_amount_gnf integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied boolean := false;
begin
  update public.payments
     set status = 'paid',
         confirmed_at = now(),
         credits = p_credits,
         amount_gnf = p_amount_gnf
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

revoke all on function public.confirm_payment(text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.confirm_payment(text, uuid, integer, integer) to service_role;
