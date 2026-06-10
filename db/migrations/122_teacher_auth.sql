alter table public.users
  add column if not exists account_type text not null default 'student';

alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
  check (account_type in ('student', 'teacher', 'admin'));

create index if not exists idx_users_account_type
  on public.users(account_type);
