# Arquitectura del Sistema

La arquitectura sigue un patrón Full-Stack Monolítico basado en Next.js (App Router), donde el cliente y el servidor comparten el mismo ecosistema.

- **Frontend**: Utiliza Server Components para renderizado rápido y Client Components para interactividad.
- **Backend**: Desarrollado sobre los Route Handlers de Next.js (ver [[Endpoints API]]).
- **Base de datos**: PostgreSQL centralizada, accesible a través de Prisma ORM (ver [[Modelo de Datos]]).
- **Servicios externos**: AWS S3 para almacenamiento de comprobantes.
- **Automatizaciones**: Webhooks y procesos asíncronos para notificaciones (ver [[Integraciones y Automatización]]).

## Estructura de Carpetas Principal
- `/app`: Enrutamiento principal (App Router) de páginas y API.
- `/components`: Componentes de UI modulares y reutilizables.
- `/prisma`: Esquema de la base de datos.
- `/lib` y `/hooks`: Configuraciones, lógica de utilidades y React hooks.

---
**Notas relacionadas**:
- [[Stack Tecnológico]]
- [[DOCUMENTACION]]

#arquitectura #nextjs #fullstack
