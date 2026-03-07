# Manual de Usuario - Sistema de Cobranza

Este documento sirve como guía completa para el uso, administración y operación diaria de la aplicación de gestión de cobranzas "Cobranza Canary".

---

## 1. Introducción y Acceso

### Iniciar Sesión
Para acceder al sistema, es necesario contar con un usuario registrado por el administrador.

1.  Ingrese a la dirección web de la aplicación.
2.  Verá la pantalla de bienvenida.
3.  Introduzca su **Correo Electrónico** y **Contraseña**.
4.  Haga clic en el botón "Iniciar Sesión".

> [!NOTE]
> **Captura 1**: Pantalla de Login (Formulario con campos de email y password).

---

## 2. Panel Principal (Dashboard)

El Dashboard es la pantalla de inicio que ofrece una visión general del estado del negocio en tiempo real.

### Resumen del Día
Tarjetas informativas (parte superior):
*   **Total Cobrado**: Suma de todos los pagos recibidos hoy.
*   **Total Prestado**: Suma de todos los préstamos desembolsados hoy.
*   **Gastos**: Total de egresos operativos registrados hoy.
*   **Utilidad/Balance**: Diferencia entre ingresos y egresos.

> [!NOTE]
> **Captura 2**: Vista superior del Dashboard con las tarjetas de métricas.

### Gráficos de Actividad
*   **Cobros vs Préstamos**: Gráfico de barras comparativo.
*   **Tendencia Semanal**: Línea de tiempo que muestra el comportamiento de los cobros en los últimos 7 días.

> [!NOTE]
> **Captura 3**: Sección de gráficos explicativos.

---

## 3. Gestión de Clientes

Acceso: Menú lateral > **Clientes** (o "Informe Clientes").

### Listado de Clientes
Muestra todos los clientes activos.
*   **Buscador**: Permite buscar por nombre, apellido o número de documento.
*   **Filtros**: Puede filtrar por ruta de cobro si tiene múltiples rutas.

> [!NOTE]
> **Captura 4**: Lista de clientes con barra de búsqueda activa.

### Registrar Nuevo Cliente
1.  Botón **"+ Nuevo Cliente"**.
2.  **Datos Personales**: Nombre, Apellido, Documento.
3.  **Contacto**: Teléfono, Dirección Domiciliaria, Dirección de Cobro.
4.  **Ubicación**: El sistema puede capturar las coordenadas GPS actuales para facilitar futuras visitas.
5.  **Fotos**: Opción para subir foto del cliente y de su documento de identidad.

> [!NOTE]
> **Captura 5**: Formulario de "Nuevo Cliente" desplegado.

---

## 4. Gestión de Préstamos

Acceso: Menú lateral > **Préstamos**.

### Crear un Nuevo Préstamo
1.  Botón **"+ Nuevo Préstamo"**.
2.  **Cliente**: Búsquelo en la lista desplegable.
3.  **Monto**: Cantidad de dinero a entregar.
4.  **Configuración**:
    *   **Interés (%)**: Porcentaje de ganancia.
    *   **Cuotas**: Cantidad de pagos (días).
    *   **Frecuencia**: Diario, Semanal, etc.
5.  **Simulación**: El sistema mostrará automáticamente de cuánto queda la cuota diaria.
6.  Clic en "Crear Préstamo".

> [!NOTE]
> **Captura 6**: Pantalla de creación de préstamo mostrando la simulación de cuotas.

### Registrar Cobros (La tarea diaria)
1.  Desde el Dashboard o la lista de Préstamos, seleccione el préstamo.
2.  Verá el **historial de pagos** y el **saldo pendiente**.
3.  Clic en **"Registrar Pago"** (icono de billete o botón verde).
4.  Ingrese el monto recibido (el sistema sugiere el valor de la cuota, pero puede editarlos).
5.  Confirme el pago.
6.  Se generará un comprobante digital (opcionalmente se puede compartir por WhatsApp).

> [!NOTE]
> **Captura 7**: Modal de registro de pago.

---

## 5. Finanzas: Gastos y Caja

### Registro de Gastos
Acceso: Menú > **Gastos**.
Es vital para el cuadre de caja registrar salidas como: combustible, alimentación, papelería, etc.

1.  Botón **"+ Nuevo Gasto"**.
2.  Concepto descriptivo.
3.  Monto del gasto.
4.  (Opcional) Foto de la factura.

> [!NOTE]
> **Captura 8**: Listado de gastos del día.

### Cierre del Día
Acceso: Menú > **Cierres de Día** (generalmente al final de la jornada).
Permite cuadrar el dinero físico con el sistema.

1.  El sistema muestra cuánto **debería haber** (Cobrado - Prestado - Gastos).
2.  El cobrador ingresa cuánto **dinero físico tiene**.
3.  El sistema calcula la diferencia (sobrante o faltante).
4.  Al confirmar el cierre, los números del día se guardan y no se pueden modificar.

> [!NOTE]
> **Captura 9**: Pantalla de resumen de Cierre de Día.

---

## 6. Reportes y Análisis

Acceso: Menú > **Reportes**.

Aquí se visualiza la salud financiera del negocio a largo plazo.

*   **Reporte de Ganancias**: Muestra la utilidad real basada en intereses cobrados.
*   **Capital en la Calle**: Cuánto dinero del capital original está aún en manos de clientes.
*   **Cartera Vencida**: Lista de clientes con pagos atrasados.
*   **Filtros de Fecha**: Permite ver reportes por semana, mes o rango personalizado.

> [!NOTE]
> **Captura 10**: Pantalla principal de Reportes mostrando gráficos de ganancias.

---

## 7. Administración y Configuración

Acceso: Menú > **Admin** (Solo usuarios Administradores).

### Gestión de Usuarios
*   Crear cuentas para nuevos cobradores.
*   Asignar roles (Admin, Cobrador).
*   Desactivar usuarios que ya no laboran.

### Configuración General
*   Definir moneda predeterminada.
*   Ajustar tasas de interés base sugeridas.

> [!NOTE]
> **Captura 11**: Panel de administración de usuarios.
