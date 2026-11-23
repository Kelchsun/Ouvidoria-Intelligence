-- Ouvidoria Intelligence: tabela da demonstração.
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem apagar nada.

create table if not exists public.ouv_estado (
  id text primary key,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Só o servidor (função da Vercel, com a chave secreta) lê e grava.
-- Sem políticas públicas: o navegador e a chave pública não acessam a tabela.
alter table public.ouv_estado enable row level security;
revoke all on public.ouv_estado from anon, authenticated;
