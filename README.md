# Tabla de Schulte

Videojuego web de atención visual. Aparece una cuadrícula (3×3, 4×4 o 5×5) con los números mezclados y hay que tocarlos **en orden, del 1 al último, lo más rápido posible**.

## Reglas

- El tiempo empieza al pulsar «Empezar partida» y termina al tocar el último número.
- Cada fallo suma 2 segundos de penalización.
- Puntuación = `1000 × (casillas) / (segundos + 2 × fallos)`, con un máximo de 1000.
- Resultado: Excelente (≥900), Bueno (≥600), Regular (≥300), Mejorable (<300).

## Tecnologías

HTML5, CSS3, JavaScript Vanilla, Vite, Supabase (PostgreSQL + Auth con Google OAuth) y GitHub.

## Ejecutarlo en local

1. `npm install`
2. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta `supabase/schema.sql` en el SQL Editor (crea la tabla `partidas` y las políticas RLS).
3. En Supabase > Authentication > Providers, activa **Google** con tu Client ID y Client Secret de Google Cloud.
4. En Supabase > Authentication > URL Configuration añade `http://localhost:5173` y la URL pública del despliegue a *Redirect URLs*.
5. Copia `.env.example` a `.env` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
6. `npm run dev` y abre http://localhost:5173

## Despliegue

Importa el repositorio en Vercel o Netlify (build: `npm run build`, carpeta: `dist`) y define las dos variables `VITE_...` en el panel del hosting.

> La clave `anon` de Supabase es pública por diseño; la seguridad la dan las políticas RLS. Nunca subas la `service_role` ni tu `.env`.
