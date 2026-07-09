# Endpoints API

El sistema expone endpoints REST en `/api/*` consumidos por el cliente Next.js y servicios externos.

- `GET /api/auth/*`: Gestión de sesiones (NextAuth).
- `GET | POST | PUT | DELETE /api/clientes`: CRUD de clientes y ubicación.
- `GET | POST | PUT | DELETE /api/prestamos`: Creación y refinanciamiento (renovación) de créditos. (Ver [[Lógica de Negocio]]).
- `POST /api/pagos`: Registro de un nuevo pago. Recibe montos, ID del préstamo e imagen del comprobante.
- `GET /api/ruta-del-dia`: Devuelve el ordenamiento y clientes pendientes de visita en el día actual según el usuario.
- `POST /api/cierre-dia`: Calcula y sella la jornada de un usuario (ver [[Flujo Operativo]]).
- `GET /api/informes`: Generación de data agregada para dashboards administrativos.
- `GET | POST /api/dispositivos`: Solicitudes y validaciones de login atado al hardware (ver [[Seguridad y Autenticación]]).

---
**Notas relacionadas**:
- [[Arquitectura del Sistema]]
- [[Lógica de Negocio]]
- [[DOCUMENTACION]]

#api #endpoints #rest
