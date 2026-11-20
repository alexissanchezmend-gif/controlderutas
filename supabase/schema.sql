-- =====================================================================
-- Seguimiento de Ruta · CD Cono Norte · esquema Supabase
-- Ejecutar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1) Administradores: solo los usuarios de esta tabla pueden subir datos
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;   -- sin políticas: nadie la lee por la API

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to anon, authenticated;

-- 2) Fuentes: una fila por archivo (bees = avance de ruta, hoja = modulaciones, disp = disponibilidad)
create table if not exists public.fuentes (
  tipo    text primary key check (tipo in ('bees','hoja','disp')),
  nombre  text not null,
  filas   int  not null,
  cargado timestamptz not null default now(),
  datos   jsonb not null              -- { cols: [...], rows: [[...], ...] }
);

-- Estado liviano para avisar en vivo a quienes tienen la página abierta
create table if not exists public.fuentes_estado (
  tipo    text primary key,
  nombre  text,
  filas   int,
  cargado timestamptz
);

create or replace function public.sync_fuentes_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.fuentes_estado (tipo, nombre, filas, cargado)
  values (new.tipo, new.nombre, new.filas, new.cargado)
  on conflict (tipo) do update
    set nombre = excluded.nombre, filas = excluded.filas, cargado = excluded.cargado;
  return new;
end $$;

drop trigger if exists trg_sync_fuentes_estado on public.fuentes;
create trigger trg_sync_fuentes_estado
  after insert or update on public.fuentes
  for each row execute function public.sync_fuentes_estado();

-- 3) Patrones IA del día (los genera el administrador, todos los ven)
create table if not exists public.ia (
  fecha      date primary key,
  filas      jsonb not null default '{}'::jsonb,   -- { "<codigo cliente>": { patron, origen } }
  resumen    jsonb,                               -- [ { titulo, pedidos, detalle, accion } ]
  actualizado timestamptz not null default now()
);

-- 4) Seguridad (RLS)
alter table public.fuentes        enable row level security;
alter table public.fuentes_estado enable row level security;
alter table public.ia             enable row level security;

drop policy if exists "leer fuentes" on public.fuentes;
drop policy if exists "leer estado"  on public.fuentes_estado;
drop policy if exists "leer ia"      on public.ia;

-- ---- OPCIÓN A (por defecto): cualquiera con el link puede VER ----
create policy "leer fuentes" on public.fuentes        for select to anon, authenticated using (true);
create policy "leer estado"  on public.fuentes_estado for select to anon, authenticated using (true);
create policy "leer ia"      on public.ia             for select to anon, authenticated using (true);

-- ---- OPCIÓN B: solo usuarios con sesión pueden VER ----
-- Si la prefieres, borra las 3 líneas de la opción A, quita los "--" de estas 3,
-- vuelve a ejecutar y pon REQUIERE_LOGIN: true en config.js.
-- create policy "leer fuentes" on public.fuentes        for select to authenticated using (true);
-- create policy "leer estado"  on public.fuentes_estado for select to authenticated using (true);
-- create policy "leer ia"      on public.ia             for select to authenticated using (true);

-- Solo administradores ESCRIBEN
drop policy if exists "admin escribe fuentes" on public.fuentes;
drop policy if exists "admin escribe ia"      on public.ia;
create policy "admin escribe fuentes" on public.fuentes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "admin escribe ia" on public.ia for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- 5) Tiempo real (avisos en vivo a los que miran)
do $$ begin
  alter publication supabase_realtime add table public.fuentes_estado;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ia;
exception when duplicate_object then null; end $$;

-- 6) Darte permiso de administrador
-- Primero crea tu usuario en Authentication > Users > Add user (correo + contraseña, "Auto Confirm User").
-- Luego cambia el correo y ejecuta SOLO esta línea:
-- insert into public.admins (user_id) select id from auth.users where email = 'tu.correo@empresa.com';
