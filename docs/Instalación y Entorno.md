# Instalación y Entorno

Guía técnica para levantar y mantener el proyecto definido en la [[Arquitectura del Sistema]].

### Requisitos e Instalación
- Node.js (v20+), npm/pnpm/yarn, Base de datos PostgreSQL.
- Comandos:
  ```bash
  npm install
  npx prisma generate
  npx prisma db push
  npm run prisma db seed
  npm run dev
  ```

### Variables de Entorno Clave
- `DATABASE_URL`: Conexión a la DB (ej. `postgresql://user:pass@localhost:5432/db`)
- `NEXTAUTH_SECRET`: Llave criptográfica.
- `NEXTAUTH_URL` y `NEXTAUTH_URL_INTERNAL`: URLs del sistema.
- `AWS_PROFILE`, `AWS_REGION`, `AWS_BUCKET_NAME`: Credenciales para el almacenamiento (ver [[Stack Tecnológico]]).

---
**Notas relacionadas**:
- [[Mantenimiento y Futuro]]
- [[DOCUMENTACION]]

#instalacion #despliegue #docker #entorno
