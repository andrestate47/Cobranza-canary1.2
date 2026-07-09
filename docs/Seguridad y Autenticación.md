# Seguridad y Autenticación

El sistema implementa múltiples capas de protección, necesarias en entornos financieros.

### Autenticación y RBAC
- **NextAuth**: Manejo de sesiones mediante JWT Tokens con rotación.
- **Roles**: Autorización a nivel de Backend comprobando `session.user.role` y permisos granulares `UserPermission` (ver [[Modelo de Datos]]).

### Validación de Hardware (Dispositivos Autorizados)
El middleware / lógica de auth cruza el Device ID para rechazar logins desde teléfonos no autorizados explícitamente por el admin. Evita fraudes de empleados "trabajando" de forma remota no supervisada.

### Protección de Datos
- **Auditoría**: Logs de auditoría detallados por cada modificación humana.
- **Integridad**: Se usa `prisma.$transaction` para evitar condiciones de carrera o mutaciones parciales en transacciones financieras (ver [[Lógica de Negocio]]).

---
**Notas relacionadas**:
- [[Modelo de Datos]]
- [[Lógica de Negocio]]
- [[DOCUMENTACION]]

#seguridad #jwt #rbac #auth
