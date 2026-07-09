# Modelo de Datos

Gestionada con PostgreSQL y Prisma ORM, las entidades principales son la base de la [[Lógica de Negocio]].

- **User**: Usuarios del sistema con roles (`ADMINISTRADOR`, `SUPERVISOR`, `COBRADOR`).
- **Cliente**: Registros de clientes. Contienen geolocalización, fotos de documentos, y ruta asignada.
- **Prestamo**: Registra el capital, interés, plazos, microseguros y estado (`ACTIVO`, `CANCELADO`, `VENCIDO`, `RENOVADO`).
- **Pago**: Movimientos de entrada por cuotas de préstamos, almacena foto del comprobante.
- **Gasto**: Registro de salidas de dinero del cobrador en campo.
- **CierreDia**: Consolidación diaria del cobrador (`totalCobrado`, `totalPrestado`, `totalGastos`, `saldoEfectivo`).
- **Ruta**: Agrupación geográfica/operativa de clientes y cobradores.
- **MovimientoCajaChica**: Trazabilidad del dinero entregado/devuelto.
- **Susu & SusuParticipante**: Modelo de ahorro comunitario ("rosca" o panderos).
- **DispositivoAutorizado**: Control de seguridad de hardware (ver [[Seguridad y Autenticación]]).

---
**Notas relacionadas**:
- [[Lógica de Negocio]]
- [[Flujo Operativo]]
- [[DOCUMENTACION]]

#database #prisma #modelos #postgres
