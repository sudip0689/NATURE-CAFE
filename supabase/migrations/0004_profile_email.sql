-- 0004_profile_email.sql — mirror the login email onto the profile.
--
-- Why duplicate it: the owner's cashier list needs to show who an account
-- belongs to, and auth.users is only reachable with the service-role key.
-- Without this, simply *viewing* the staff list would require the admin key —
-- which would mean an owner who hasn't configured it can't even deactivate a
-- cashier in a hurry. Deactivation is the one thing that must always work.
--
-- Kept in sync by trigger in both directions of change, so it can't drift.

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'
      else 'cashier'
    end,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_profile_email();
