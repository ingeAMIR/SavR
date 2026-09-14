# Puesta en marcha de SavR

Guía completa para dejar la app corriendo en local y, cuando quieras, en Vercel.
Todo lo que aparece aquí es trabajo de consola/paneles: el código ya está listo.

---

## 1. Supabase

### 1.1 Crear el proyecto

1. Entra a <https://supabase.com/dashboard> y crea un proyecto (región cercana a tus
   usuarios; para México, `us-east-1` o `us-west-1` funcionan bien).
2. Guarda la contraseña de la base de datos que te pide al crearlo.

### 1.2 Aplicar las migraciones

Las migraciones están en `supabase/migrations/` y hay que correrlas **en orden**.

**Opción A — SQL Editor (más rápido, sin instalar nada):**
copia y ejecuta, uno por uno y en este orden:

1. `0001_schema.sql`
2. `0002_rls.sql`
3. `0003_rpc.sql`
4. `0004_goals_owner_fix.sql`
5. `0005_goal_completion_trigger.sql`
6. `0006_contribution_frequency.sql`

**Opción B — CLI (recomendado si vas a seguir iterando el esquema):**

```bash
npm i -g supabase
supabase login
supabase link --project-ref <tu-project-ref>
supabase db push
```

### 1.3 Verificar

En *Table Editor* deben existir: `profiles`, `goals`, `goal_members`, `contributions`,
`reactions`, `wishlist_items`, `invitations` — todas con el candado de RLS activo.
En *Storage* debe existir el bucket público `goal-covers`.

### 1.4 Realtime

Las migraciones ya agregan las tablas a la publicación `supabase_realtime`. Si en
*Database → Replication* no aparecen marcadas, actívalas a mano para
`contributions`, `goals`, `goal_members` y `reactions`.

---

## 2. Google Sign-In

### 2.1 Google Cloud Console

1. Ve a <https://console.cloud.google.com/> y crea (o elige) un proyecto.
2. *APIs & Services → OAuth consent screen*
   - Tipo: **External**.
   - Nombre de la app: `SavR`; correo de soporte y de contacto: el tuyo.
   - Scopes: bastan los básicos (`email`, `profile`, `openid`).
   - Mientras esté en *Testing*, agrega como **test users** los correos con los que
     vayas a probar. Para abrirla al público hay que publicar la pantalla de consentimiento.
3. *APIs & Services → Credentials → Create credentials → OAuth client ID*
   - Tipo: **Web application**.
   - **Authorized redirect URI** (una sola, la de Supabase):
     `https://<tu-project-ref>.supabase.co/auth/v1/callback`
   - Copia el **Client ID** y el **Client Secret**.

### 2.2 Supabase Auth

1. *Authentication → Providers → Google*: pégalos y activa el proveedor.
2. *Authentication → URL Configuration*
   - **Site URL**: `http://localhost:3000` en desarrollo; la URL de producción cuando
     despliegues.
   - **Redirect URLs** (agrega todas las que uses):
     ```
     http://localhost:3000/auth/callback
     https://<tu-dominio>/auth/callback
     https://<preview>.vercel.app/auth/callback
     ```
   Si esta lista no incluye la URL exacta, el login falla con `redirect_to not allowed`.

---

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

| Variable | Dónde sale |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → *Project Settings → API → Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → *Project Settings → API → anon public* |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local; tu dominio en producción |

Las tres son públicas por diseño (la `anon key` está pensada para el navegador y toda
la seguridad real vive en las políticas RLS). **No** metas aquí la `service_role key`.

```bash
npm install
npm run dev
```

---

## 4. Vercel (cuando toque desplegar)

1. Importa el repo en <https://vercel.com/new>. El framework se detecta solo (Next.js);
   no hay que tocar los comandos de build.
2. En *Environment Variables* de la pantalla de import (o luego en *Settings →
   Environment Variables*) captura **sólo dos**:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, con los valores de
     Supabase → *Project Settings → API*. Déjalas en *Production and Preview*.
   - Nunca la `service_role` / *secret key*: al ser variables `NEXT_PUBLIC_` terminan
     dentro del bundle que descarga el navegador.
3. **Borra la fila de `NEXT_PUBLIC_SITE_URL`** (botón `−`). Todavía no conoces la URL del
   deploy, y una cadena vacía no equivale a ausente. Sin ella, `GoogleButton` y
   `CollaboratorsPanel` caen a `window.location.origin`, que es justo lo correcto en cada
   preview. Agrégala después **sólo en Production** si conectas un dominio propio, para
   que los enlaces de invitación apunten siempre ahí.
4. Vuelve a Supabase → *Authentication → URL Configuration*:
   - *Site URL*: la URL de producción.
   - *Redirect URLs*: agrega `https://<tu-proyecto>.vercel.app/auth/callback` y, para los
     previews, el comodín `https://<tu-proyecto>-*.vercel.app/auth/callback`.
5. En Google Cloud **no se toca nada**: la única *Authorized redirect URI* sigue siendo la
   de Supabase. Google nunca ve tu dominio de Vercel.
6. Si conectas un dominio propio, repite los pasos 3 y 4 con él.

No hace falta configuración de regiones ni de runtime: todas las rutas de datos son
dinámicas y se sirven desde el Node runtime por defecto.

---

## 5. Decisiones que quedan abiertas

Ninguna bloquea el uso de la app; son mejoras con dependencia externa.

### 5.1 Recordatorio nocturno garantizado (Web Push)

Hoy el recordatorio es una **notificación local**: se programa en el dispositivo y sólo
se dispara si la PWA sigue viva en segundo plano. Para que llegue siempre, aunque la
app esté cerrada, falta:

1. Generar un par de llaves VAPID (`npx web-push generate-vapid-keys`).
2. Una tabla `push_subscriptions` y el endpoint que guarda la suscripción del navegador.
3. Un cron (Vercel Cron o `pg_cron` + Edge Function de Supabase) que cada hora busque
   usuarios cuya hora de recordatorio acaba de pasar y que no hayan abonado hoy.

El `push` handler en `public/sw.js` ya está escrito y funcionando: sólo falta quién
mande el mensaje.

### 5.2 Widget de pantalla de inicio

El PRD pide un widget nativo iOS/Android. Con la PWA se cubre parcialmente vía los
**app shortcuts** del manifiesto (mantener presionado el ícono → "Abonar hoy"). Un
widget real requiere envoltura nativa (Capacitor + WidgetKit / App Widget) o una app
nativa aparte que consuma la misma base de Supabase.

### 5.3 Invitación por correo

Hoy la invitación genera un **código y un enlace** que tú compartes por el canal que
quieras (el botón usa `navigator.share`). Enviar el correo automáticamente requiere un
proveedor (Resend, Postmark) y una Edge Function; el campo `invited_email` ya restringe
quién puede aceptar la invitación.

### 5.4 Íconos definitivos

`public/icons/` trae íconos generados proceduralmente que sirven de placeholder.
Reemplázalos por los de tu diseño manteniendo los nombres y tamaños.

### 5.5 Datos y privacidad

- Si publicas la pantalla de consentimiento de Google, necesitarás una URL de política
  de privacidad. La ruta `/legal` ya está exenta de autenticación en el middleware para
  que puedas colgarla ahí.
- Si algún día quieres borrado de cuenta desde la app, hace falta una Edge Function con
  `service_role` (el cliente del navegador no puede borrar usuarios de `auth.users`).
