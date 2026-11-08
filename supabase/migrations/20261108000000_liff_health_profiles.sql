begin;

create table public.liff_health_profiles (
  line_user_id text primary key check (line_user_id ~ '^U[0-9a-f]{32}$'),
  gender text not null check (gender in ('female', 'male', 'other')),
  age smallint not null check (age between 1 and 120),
  height_cm numeric(4,1) not null check (height_cm between 80 and 250),
  weight_kg numeric(4,1) not null check (weight_kg between 20 and 400),
  bmi numeric(4,1) generated always as (round(weight_kg / ((height_cm / 100) ^ 2), 1)) stored,
  consent_version text not null check (length(consent_version) between 1 and 40),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.liff_health_profiles enable row level security;
revoke all on table public.liff_health_profiles from public, anon, authenticated, service_role;
grant select, insert, update on table public.liff_health_profiles to service_role;

commit;
