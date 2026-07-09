# Mantenimiento y Futuro

Listado del estado del proyecto, issues, e hitos de mejora.

### Problemas conocidos
- **Sensibilidad a decimales**: Alta sensibilidad a errores de punto flotante. Crítico forzar redondeo a 2 decimales.
- **Sincronización GPS**: Si la conexión del dispositivo falla en ruta, a veces hay problemas en el registro (ver [[Flujo Operativo]]).

### Ideas futuras
- **Modo Offline First**: Uso de Service Workers / PWA para cobros sin señal.
- **Integración Bidireccional Completa**: Finalizar la integración bidireccional en Meta Graph API de forma nativa para auto-respuestas de Robotina (ver [[Integraciones y Automatización]]).

### Pendientes
- [ ] Optimizar carga inicial de la tabla de listado general de préstamos.
- [ ] Implementar reintentos en subida de fotos a AWS S3.
- [ ] Consolidar la conexión webhook final para DMs hacia n8n.

### Comandos útiles
- `npx prisma studio`: Panel gráfico de DB.
- `npx prisma migrate dev`: Generar migraciones formales.

---
**Notas relacionadas**:
- [[Instalación y Entorno]]
- [[DOCUMENTACION]]

#mantenimiento #futuro #todo
