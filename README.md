# SavR

Alcancías digitales para metas de consumo. Conviertes lo que quieres comprar en una
meta con **cuota diaria**, la abonas de un toque, y puedes compartirla con alguien
más con sincronización en tiempo real.

> SavR **no mueve dinero real**. Es un simulador y tracker de hábitos: tú registras
> tus abonos y la app lleva la cuenta, el ritmo y la racha.

## Qué hace

- **Metas** con foto, precio, fecha límite y cuota diaria calculada automáticamente.
- **Sugerencia de redondeo**: si tu cuota da $33.40/día, te propone $40/día y te dice
  cuántos días adelantas.
- **Dos modos para el excedente**
  - *Buffer*: lo que abonas de más cubre los días siguientes (la fecha no se mueve y
    tu racha queda protegida).
  - *Aceleración*: el excedente adelanta la fecha meta y la cuota diaria no cambia.
- **Atrasos sin castigo**: se acumulan y se muestran, con un botón de "ponerme al día".
- **Botón maestro**: abona la cuota del día en todas tus metas activas a la vez.
- **Gasto hormiga evitado**: registra el café que no compraste y mándalo a una meta.
- **Metas compartidas**: invitación por correo o por código/enlace, reparto 50/50,
  70/30 o el que quieras. Cada quien abona sólo su parte.
- **Feed de actividad** con avatares de Google, notas y reacciones rápidas.
- **Racha, hitos (25/50/75/100%)**, calendario de 35 días y recordatorio nocturno.
- **Wishlist / congelador**: deseos sin compromiso; al completar una meta, SavR te
  propone ascender uno.
- **PWA instalable** con íconos, atajos y shell offline.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # y rellena las variables
npm run dev
```

Antes necesitas un proyecto de Supabase con las migraciones aplicadas y Google OAuth
configurado: todo está paso a paso en [DEPLOYMENT.md](./DEPLOYMENT.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run test` | Pruebas del motor de cálculo (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Estructura

```
src/
  app/
    (app)/            rutas autenticadas (dashboard, metas, wishlist, actividad, perfil)
    auth/callback/    intercambio del código OAuth por sesión
    join/[code]/      landing pública de invitación
    login/
  components/
    auth/ goals/ home/ profile/ shell/ ui/ wishlist/
  lib/
    actions/          Server Actions (mutaciones)
    data/             lecturas de servidor + view models
    savings/          motor de cálculo puro (cuotas, buffer, rachas) + tests
    supabase/         clientes browser/server/middleware y tipos
supabase/migrations/  esquema, RLS y RPCs
```

El **motor de cálculo** (`src/lib/savings/engine.ts`) es la única fuente de verdad
sobre cuotas, atrasos, buffer, rachas y proyecciones. No conoce React ni la red, y
está cubierto por pruebas.
