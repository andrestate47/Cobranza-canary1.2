/*
  Warnings:

  - You are about to drop the column `cedula` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `posicionRuta` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codigoCliente]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documento]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigoCliente` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direccionCliente` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documento` to the `clientes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('SINCRONIZAR_DATOS', 'REGISTRAR_COBROS', 'MAPA_CLIENTES', 'REGISTRAR_GASTOS', 'REGISTRAR_INGRESOS', 'VER_REPORTES', 'VER_DASHBOARD', 'VER_LISTADO_GENERAL', 'VER_DETALLES_PRESTAMO', 'CREAR_CLIENTES', 'EDITAR_CLIENTES', 'CREAR_PRESTAMOS', 'EDITAR_PRESTAMOS', 'ELIMINAR_PRESTAMOS', 'REGISTRAR_TRANSFERENCIAS', 'VER_TRANSFERENCIAS', 'GESTIONAR_USUARIOS', 'VER_AUDITORIA', 'CONFIGURAR_SISTEMA', 'GESTIONAR_PERMISOS', 'REALIZAR_CIERRE_DIA', 'VER_CIERRES_HISTORICOS');

-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoMicroseguro" AS ENUM ('NINGUNO', 'MONTO_FIJO', 'PORCENTAJE');

-- CreateEnum
CREATE TYPE "TipoPagoSueldo" AS ENUM ('SUELDO', 'AVANCE', 'COMISION_EXTRA', 'DESCUENTO');

-- CreateEnum
CREATE TYPE "EstadoPagoSueldo" AS ENUM ('PENDIENTE', 'PAGADO', 'CANCELADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoVisita" AS ENUM ('COBRO', 'SEGUIMIENTO', 'NEGOCIACION', 'ENTREGA_DOCUMENTOS', 'VERIFICACION', 'OTROS');

-- CreateEnum
CREATE TYPE "FrecuenciaSusu" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "EstadoSusu" AS ENUM ('ACTIVO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoParticipante" AS ENUM ('ACTIVO', 'RETIRADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "MetodoPagoSusu" AS ENUM ('SALDO', 'DEPOSITO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoPagoSusu" AS ENUM ('COMPLETADO', 'RETRASO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "EstadoDispositivo" AS ENUM ('PENDIENTE', 'AUTORIZADO', 'RECHAZADO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoMovimiento" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoAccion" AS ENUM ('CREAR', 'MODIFICAR', 'ELIMINAR');

-- CreateEnum
CREATE TYPE "TipoEntidad" AS ENUM ('CLIENTE', 'PRESTAMO', 'PAGO', 'GASTO', 'TRANSFERENCIA', 'USUARIO', 'CONFIGURACION_SUELDO', 'PAGO_SUELDO', 'SUSU', 'DISPOSITIVO', 'CAJA_CHICA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('ENTREGA', 'ENTREGADO', 'DEVOLUCION', 'DEVUELTO', 'AJUSTE', 'GASTO', 'GASTADO', 'APERTURA_CAJA', 'EGRESO_GENERAL');

-- CreateEnum
CREATE TYPE "PlanSuscripcion" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('PRUEBA', 'ACTIVA', 'VENCIDA', 'CANCELADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "MetodoPagoSuscripcion" AS ENUM ('TRANSFERENCIA_BANCARIA', 'DEPOSITO', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('USD', 'EUR', 'MXN', 'BRL', 'ARS', 'COP', 'PEN', 'USD_EC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoPago" ADD VALUE 'LUNES_A_VIERNES';
ALTER TYPE "TipoPago" ADD VALUE 'LUNES_A_SABADO';
ALTER TYPE "TipoPago" ADD VALUE 'CATORCENAL';
ALTER TYPE "TipoPago" ADD VALUE 'FIN_DE_MES';
ALTER TYPE "TipoPago" ADD VALUE 'TRIMESTRAL';
ALTER TYPE "TipoPago" ADD VALUE 'CUATRIMESTRAL';
ALTER TYPE "TipoPago" ADD VALUE 'SEMESTRAL';
ALTER TYPE "TipoPago" ADD VALUE 'ANUAL';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERVISOR';

-- DropIndex
DROP INDEX "clientes_cedula_key";

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "cedula",
DROP COLUMN "direccion",
DROP COLUMN "posicionRuta",
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "codigoCliente" TEXT NOT NULL,
ADD COLUMN     "direccionCliente" TEXT NOT NULL,
ADD COLUMN     "direccionCobro" TEXT,
ADD COLUMN     "documento" TEXT NOT NULL,
ADD COLUMN     "fotoDocumento" TEXT,
ADD COLUMN     "map_link" TEXT,
ADD COLUMN     "numero_ruta" TEXT,
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "referenciasPersonales" TEXT,
ADD COLUMN     "ruta_id" TEXT,
ADD COLUMN     "ubicacion" TEXT,
ADD COLUMN     "ultimaVisita" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gastos" ADD COLUMN     "foto_comprobante" TEXT;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO';

-- AlterTable
ALTER TABLE "prestamos" ADD COLUMN     "diasGracia" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "interesTotal" DECIMAL(10,2),
ADD COLUMN     "microseguro_tipo" "TipoMicroseguro" NOT NULL DEFAULT 'NINGUNO',
ADD COLUMN     "microseguro_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "microseguro_valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "moraCredito" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tipoCredito" "TipoCredito" NOT NULL DEFAULT 'EFECTIVO';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isActive",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "documento_identificacion" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "map_link" TEXT,
ADD COLUMN     "numero_ruta" TEXT,
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phone_referencial" TEXT,
ADD COLUMN     "profile_photo" TEXT,
ADD COLUMN     "referencia_familiar" TEXT,
ADD COLUMN     "referencia_trabajo" TEXT,
ADD COLUMN     "ruta_id" TEXT,
ADD COLUMN     "supervisor_id" TEXT,
ADD COLUMN     "timeLimit" INTEGER,
ADD COLUMN     "ubicacion" TEXT;

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_time_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_time_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" TEXT NOT NULL,
    "prestamo_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "banco" TEXT,
    "referencia" TEXT,
    "fotoComprobante" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_sueldo" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "salarioBase" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "comisionPorCobro" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "limitePorcentajeAvance" INTEGER NOT NULL DEFAULT 50,
    "montoMinimoAvance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_sueldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_sueldo" (
    "id" TEXT NOT NULL,
    "cobrador_id" TEXT NOT NULL,
    "pagador_id" TEXT NOT NULL,
    "configuracion_id" TEXT,
    "tipo" "TipoPagoSueldo" NOT NULL DEFAULT 'SUELDO',
    "periodo" TEXT,
    "montoBase" DECIMAL(10,2) NOT NULL,
    "montoComisiones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "montoAvances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoFinal" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPagoSueldo" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "fechaPago" TIMESTAMP(3),
    "metodoPago" TEXT,
    "comprobante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_sueldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoVisita" NOT NULL DEFAULT 'COBRO',
    "resultado" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos_autorizados" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "device_name" TEXT,
    "estado" "EstadoDispositivo" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por" TEXT,
    "fecha_aprobacion" TIMESTAMP(3),
    "ultimo_acceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivos_autorizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "susus" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "frecuencia" "FrecuenciaSusu" NOT NULL DEFAULT 'SEMANAL',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoSusu" NOT NULL DEFAULT 'ACTIVO',
    "creador_id" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "susus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "susu_participantes" (
    "id" TEXT NOT NULL,
    "susu_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "montoPorPeriodo" DECIMAL(10,2) NOT NULL,
    "yaRecibio" BOOLEAN NOT NULL DEFAULT false,
    "fechaRecepcion" TIMESTAMP(3),
    "estado" "EstadoParticipante" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "susu_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "susu_pagos" (
    "id" TEXT NOT NULL,
    "susu_id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "numeroPeriodo" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPagoSusu" NOT NULL DEFAULT 'SALDO',
    "estado" "EstadoPagoSusu" NOT NULL DEFAULT 'COMPLETADO',
    "observaciones" TEXT,
    "comprobante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "susu_pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" "TipoAccion" NOT NULL,
    "entidad" "TipoEntidad" NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "detalles" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja_chica" (
    "id" TEXT NOT NULL,
    "cobrador_id" TEXT,
    "asignado_por_id" TEXT,
    "tipo" "TipoMovimientoCaja" NOT NULL DEFAULT 'ENTREGA',
    "monto" DECIMAL(10,2) NOT NULL,
    "saldoAnterior" DECIMAL(10,2) NOT NULL,
    "saldoNuevo" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "descripcion" TEXT,
    "comprobante" TEXT,
    "estado" "EstadoMovimiento" NOT NULL DEFAULT 'APROBADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_caja_chica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "nombre_empresa" TEXT NOT NULL,
    "email_contacto" TEXT NOT NULL,
    "telefono_contacto" TEXT,
    "ruc_empresa" TEXT,
    "direccion" TEXT,
    "plan" "PlanSuscripcion" NOT NULL DEFAULT 'MENSUAL',
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'PRUEBA',
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "fecha_activacion" TIMESTAMP(3),
    "fecha_cancelacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_suscripcion" (
    "id" TEXT NOT NULL,
    "suscripcion_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo_pago" "MetodoPagoSuscripcion" NOT NULL DEFAULT 'TRANSFERENCIA_BANCARIA',
    "banco" TEXT,
    "numero_referencia" TEXT,
    "comprobante_url" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fin" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "verificado_por" TEXT,
    "fecha_verificacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_key" ON "user_permissions"("user_id", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "user_time_usage_user_id_date_key" ON "user_time_usage"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_sueldo_user_id_key" ON "configuraciones_sueldo"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_autorizados_user_id_device_id_key" ON "dispositivos_autorizados"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "rutas_numero_key" ON "rutas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "susu_participantes_susu_id_user_id_key" ON "susu_participantes"("susu_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "susu_participantes_susu_id_orden_key" ON "susu_participantes"("susu_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_email_contacto_key" ON "suscripciones"("email_contacto");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_ruc_empresa_key" ON "suscripciones"("ruc_empresa");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigoCliente_key" ON "clientes"("codigoCliente");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_time_usage" ADD CONSTRAINT "user_time_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_sueldo" ADD CONSTRAINT "configuraciones_sueldo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_sueldo" ADD CONSTRAINT "pagos_sueldo_cobrador_id_fkey" FOREIGN KEY ("cobrador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_sueldo" ADD CONSTRAINT "pagos_sueldo_configuracion_id_fkey" FOREIGN KEY ("configuracion_id") REFERENCES "configuraciones_sueldo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_sueldo" ADD CONSTRAINT "pagos_sueldo_pagador_id_fkey" FOREIGN KEY ("pagador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_cliente" ADD CONSTRAINT "visitas_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_cliente" ADD CONSTRAINT "visitas_cliente_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos_autorizados" ADD CONSTRAINT "dispositivos_autorizados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "susus" ADD CONSTRAINT "susus_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "susu_participantes" ADD CONSTRAINT "susu_participantes_susu_id_fkey" FOREIGN KEY ("susu_id") REFERENCES "susus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "susu_participantes" ADD CONSTRAINT "susu_participantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "susu_pagos" ADD CONSTRAINT "susu_pagos_susu_id_fkey" FOREIGN KEY ("susu_id") REFERENCES "susus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "susu_pagos" ADD CONSTRAINT "susu_pagos_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "susu_participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja_chica" ADD CONSTRAINT "movimientos_caja_chica_cobrador_id_fkey" FOREIGN KEY ("cobrador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja_chica" ADD CONSTRAINT "movimientos_caja_chica_asignado_por_id_fkey" FOREIGN KEY ("asignado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
