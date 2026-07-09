# Lógica de Negocio

El sistema tiene reglas complejas que procesan el [[Modelo de Datos]] a través de los [[Endpoints API]].

### Transacciones de Pagos
Cuando se registra un pago, el sistema no solo crea la entidad `Pago`, sino que re-calcula las cuotas pendientes, el atraso y, si el saldo llega a cero, pasa el estado de la entidad a `CANCELADO`. Este proceso es crítico y debe manejar precisos decimales.

### Renovación (Refinanciamiento)
Si un cliente quiere un crédito nuevo sin haber cancelado el anterior, se calcula el saldo pendiente y se cruza con el nuevo préstamo entregando solo la diferencia ("líquido a recibir").

### Susu
Modo de ahorro grupal (panderos/roscas) para participantes que aportan periódicamente y reciben el fondo total en un orden predefinido.

### Auditoría
Toda creación, modificación o borrado se traza de forma indeleble en `RegistroAuditoria` (ver [[Seguridad y Autenticación]]).

---
**Notas relacionadas**:
- [[Endpoints API]]
- [[Modelo de Datos]]
- [[DOCUMENTACION]]

#logica #negocio #finanzas
