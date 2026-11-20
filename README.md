# Seguimiento de Ruta · CD Cono Norte (GitHub Pages + Supabase)

Dashboard de avance de ruta, % MR, tiempo de mercado y detalle de rechazos con patrones IA.

- **Tú (administrador)** entras con correo y contraseña y subes los archivos.
- **Los demás** abren el link y ven lo último que subiste, actualizado en vivo, sin poder modificar nada.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | La página (va a GitHub Pages) |
| `config.js` | Tu URL y clave pública de Supabase (va a GitHub Pages) |
| `supabase/schema.sql` | Tablas, seguridad y tiempo real (se ejecuta una vez en Supabase) |
| `supabase/functions/patrones-ia/index.ts` | Opcional: columna "Patrón IA" con la API de Claude |

---

## 1. Crear la base en Supabase (una sola vez)

1. Entra a <https://supabase.com>, crea un proyecto (región São Paulo es la más cercana a Lima).
2. Ve a **SQL Editor → New query**, pega todo `supabase/schema.sql` y pulsa **Run**.

## 2. Crear tu usuario administrador

1. **Authentication → Users → Add user → Create new user**: tu correo, una contraseña y marca **Auto Confirm User**.
2. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**, para que nadie más pueda crearse una cuenta.
3. En **SQL Editor** ejecuta esta línea con tu correo:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'tu.correo@empresa.com';
   ```

## 3. Configurar la página

1. En Supabase ve a **Project Settings → API Keys** y copia la **Project URL** y la clave **anon public** (pestaña *Legacy API keys*).
2. Abre `config.js` y reemplaza `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   - La clave *anon* está hecha para ir en el navegador; la protección la ponen las reglas de `schema.sql`.
   - **Nunca** pongas la clave `service_role`.

## 4. Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `seguimiento-ruta`).
2. Sube `index.html` y `config.js` a la raíz. La carpeta `supabase/` puedes subirla también como respaldo; no afecta la página.
3. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
4. En uno o dos minutos la página queda en `https://TU-USUARIO.github.io/seguimiento-ruta/`.
5. (Recomendado) En Supabase, **Authentication → URL Configuration → Site URL**: pega ese link.

## 5. Uso diario

1. Abre la página y en la barra izquierda pulsa **Ingresar para actualizar** → correo y contraseña.
2. Aparecen los botones de carga:
   - **Avance de ruta (BEEs)**: el CSV `routes-data_...` → varias veces al día.
   - **Hoja de ruta / modulaciones**: el Excel `HOJA_RUTA_...` → varias veces al día.
   - **Disponibilidad de camiones**: el Excel de flota → solo si cambia.
3. Cada archivo se actualiza por separado. Si la página no reconoce el archivo en esa casilla, avisa y no lo sube.
4. Quien tenga la página abierta ve los cambios en unos segundos, sin recargar.
5. (Si activaste la IA) pulsa **Detectar patrones con IA** en "Detalle de rechazos": se guarda y todos lo ven.

---

## 6. (Opcional) Patrones IA con Claude

Necesitas una clave de la API de Anthropic (<https://console.anthropic.com>), que tiene costo por uso, y la CLI de Supabase:

```bash
npm i -g supabase            # o: brew install supabase/tap/supabase
supabase login
supabase link --project-ref TU-PROJECT-REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy patrones-ia
```

- La función solo responde a administradores, y la clave de Anthropic nunca llega al navegador.
- Si no la vas a usar, pon `IA_FUNCION: ""` en `config.js` para ocultar el botón.

---

## Privacidad: léelo antes de compartir el link

Los sitios de GitHub Pages son **públicos**. Con la configuración por defecto (opción A), **cualquiera que tenga el link** puede ver los datos subidos: nombres de clientes, montos y comentarios. Los datos no quedan en el repositorio, solo en Supabase, pero la página los muestra a quien la abra.

Si prefieres que solo vea tu equipo:

1. En `schema.sql` usa la **opción B**: borra las 3 políticas "leer…" de la opción A, quita los `--` de las 3 de la opción B y vuelve a ejecutar.
2. En `config.js` pon `REQUIERE_LOGIN: true`.
3. Crea un usuario para cada persona en **Authentication → Users → Add user**, sin agregarlos a `admins`. Así pueden ver, pero no subir.

## Notas

- El plan gratuito de Supabase pausa el proyecto tras ~7 días sin uso; se reactiva desde el panel.
- Cada carga reemplaza el archivo anterior de su tipo, así que el espacio usado no crece.
- La lógica de cálculo es la misma de tu Power Query; se detalla al final de la página, en "Lógica usada".
