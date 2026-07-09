# Flujo Operativo

El ciclo de vida diario del sistema se basa en la interacción entre la administración y los cobradores. Se apoya en el [[Modelo de Datos]] y en las funcionalidades de la [[Lógica de Negocio]].

1. **Setup Inicial**: El `ADMINISTRADOR` crea una `Ruta`, configura a los `Cobradores` y les asigna saldo mediante `MovimientoCajaChica`.
2. **Operación de Campo (Alta)**: El Cobrador visita a un prospecto y crea un `Cliente` adjuntando geolocalización.
3. **Desembolso**: Se aprueba y registra un `Prestamo` al Cliente; el dinero sale de la caja del cobrador.
4. **Cobro Diario**: En la vista de "Ruta del Día", el cobrador registra un `Pago` para la cuota. Se puede reflejar atraso o abonos. Imprime o comparte recibos vía WhatsApp (ver [[Integraciones y Automatización]]).
5. **Cierre de Jornada**: Al final del día, el cobrador realiza el `CierreDia`.
6. **Administración**: El Administrador visualiza reportes, verifica ubicaciones y emite los `PagoSueldo` (comisiones y sueldo base).

---
**Notas relacionadas**:
- [[Modelo de Datos]]
- [[Lógica de Negocio]]
- [[DOCUMENTACION]]

#flujo #operaciones #cobranza
