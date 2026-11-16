-- Ejecuta este script en Supabase > SQL Editor

create table if not exists public.partidas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       timestamptz not null default now(),
  resultado   text not null,
  puntuacion  integer not null check (puntuacion >= 0),
  duracion    numeric(8,2) not null check (duracion >= 0),  -- segundos
  tamano      smallint not null,                            -- 3, 4 o 5
  errores     smallint not null default 0
);

create index if not exists partidas_user_fecha_idx on public.partidas (user_id, fecha desc);

-- Row Level Security: cada usuario solo ve e inserta SUS partidas
alter table public.partidas enable row level security;

drop policy if exists "Ver mis partidas" on public.partidas;
create policy "Ver mis partidas"
  on public.partidas for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Guardar mis partidas" on public.partidas;
create policy "Guardar mis partidas"
  on public.partidas for insert to authenticated
  with check (auth.uid() = user_id);

-- Sin políticas de UPDATE ni DELETE: nadie puede modificar ni borrar partidas desde la app.
