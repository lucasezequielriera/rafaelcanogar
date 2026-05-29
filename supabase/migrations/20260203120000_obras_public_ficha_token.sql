-- Enlace opaco para ficha pública de obra (QR sin login)

alter table public.obras
  add column if not exists public_ficha_token text;

create unique index if not exists idx_obras_public_ficha_token_unique
  on public.obras (public_ficha_token)
  where public_ficha_token is not null;

comment on column public.obras.public_ficha_token is 'Token secreto para URL /p/[token]; solo lectura pública de datos no confidenciales.';
