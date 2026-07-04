
"use client"

import { useState, useEffect } from "react"
import { Session } from "next-auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  Plus,
  Eye,
  Trash2,
  AlertTriangle,
  Camera,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calculator,
  MessageCircle,
  Send,
  CreditCard,
  Edit,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import PagoRapidoModal from "@/components/pago-rapido-modal"
import CameraModal from "@/components/camera-modal"
import TransferenciaModal from "@/components/transferencia-modal"
import ImageViewerModal from "@/components/image-viewer-modal"
import BoletaViewerModal from "@/components/boleta-viewer-modal"

// Tipos basados en el modelo de Prisma
interface Cliente {
  id: string
  codigoCliente: string
  documento: string
  nombre: string
  apellido: string
  direccionCliente: string
  direccionCobro: string | null
  telefono: string | null
  mapLink: string | null
  foto: string | null
  fotoDocumento: string | null
}

interface PagoUsuario {
  firstName?: string
  lastName?: string
  name?: string
}

interface Pago {
  id: string
  prestamoId: string
  monto: number
  fecha: string | Date
  observaciones: string | null
  metodoPago: string
  usuario?: PagoUsuario
  createdAt?: string | Date
}

interface Transferencia {
  id: string
  prestamoId: string
  monto: number
  banco: string | null
  referencia: string | null
  fotoComprobante: string
  observaciones: string | null
  fecha: string | Date
  usuario?: {
    firstName: string | null
    lastName: string | null
  }
}

interface Prestamo {
  id: string
  clienteId: string
  userId: string
  monto: number
  interes: number
  tipoPago: string
  cuotas: number
  valorCuota: number
  fechaInicio: string | Date
  fechaFin: string | Date
  estado: string
  observaciones: string | null
  tipoCredito: string
  interesTotal: number | null
  diasGracia: number
  moraCredito: number
  microseguroTipo: string
  microseguroValor: number
  microseguroTotal: number
  createdAt: string | Date
  updatedAt: string | Date
  cliente: Cliente
  pagos: Pago[]
  transferencias?: Transferencia[]
  renovadoDeId?: string | null
  datosRefinanciamiento?: any
  prestamoAnteriorInfo?: any
  usuario?: {
    firstName: string | null
    lastName: string | null
  }
}

interface DetallePrestamoProps {
  prestamo: Prestamo
  session: Session
}

export default function DetallePrestamoClient({ prestamo, session }: DetallePrestamoProps) {
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRenovacionModal, setShowRenovacionModal] = useState(false)
  const [tipoOperacion, setTipoOperacion] = useState<"REFINANCIAMIENTO" | "RENOVACION">("REFINANCIAMIENTO")
  const [renovando, setRenovando] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [showEditarBoletaModal, setShowEditarBoletaModal] = useState(false)
  const [editando, setEditando] = useState(false)
  const [montoTotalEditar, setMontoTotalEditar] = useState(0)
  const [cuotaEditar, setCuotaEditar] = useState(0)
  const [fechaInicioEditar, setFechaInicioEditar] = useState<string>("")
  const [fechaFinEditar, setFechaFinEditar] = useState<string>("")
  const [diasTranscurridosEditar, setDiasTranscurridosEditar] = useState<string>("")
  const [fechaProximoPagoEditar, setFechaProximoPagoEditar] = useState<string>("")
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string, subtitle?: string } | null>(null)
  const [showRefinanciamientoHistory, setShowRefinanciamientoHistory] = useState(false)
  const [showSnapshotModal, setShowSnapshotModal] = useState(false)

  // Estado para visualización de boleta histórica
  const [showBoletaModal, setShowBoletaModal] = useState(false)
  const [selectedBoletaData, setSelectedBoletaData] = useState<any>(null)

  const { toast } = useToast()
  const { format: formatCurrency } = useCurrency()
  const router = useRouter()

  // Estados para el formulario de renovación
  const [montoRenovacion, setMontoRenovacion] = useState("")
  const [interesRenovacion, setInteresRenovacion] = useState("")
  const [tipoPagoRenovacion, setTipoPagoRenovacion] = useState("DIARIO")
  const [cuotasRenovacion, setCuotasRenovacion] = useState("")
  const [tipoMicroseguroRenovacion, setTipoMicroseguroRenovacion] = useState("NINGUNO")
  const [valorMicroseguroRenovacion, setValorMicroseguroRenovacion] = useState("0")
  const [fechaInicioRenovacion, setFechaInicioRenovacion] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [observacionesRenovacion, setObservacionesRenovacion] = useState("")

  // Estados para el formulario de edición de cliente y boleta
  const [nombreEditar, setNombreEditar] = useState("")
  const [apellidoEditar, setApellidoEditar] = useState("")
  const [documentoEditar, setDocumentoEditar] = useState("")
  const [telefonoEditar, setTelefonoEditar] = useState("")
  const [direccionClienteEditar, setDireccionClienteEditar] = useState("")
  const [direccionCobroEditar, setDireccionCobroEditar] = useState("")
  const [montoEditar, setMontoEditar] = useState("")
  const [interesEditar, setInteresEditar] = useState("")
  const [tipoPagoEditar, setTipoPagoEditar] = useState("")
  const [cuotasEditar, setCuotasEditar] = useState("")
  const [tipoMicroseguroEditar, setTipoMicroseguroEditar] = useState(prestamo.microseguroTipo)
  const [valorMicroseguroEditar, setValorMicroseguroEditar] = useState(prestamo.microseguroValor?.toString() || "0")
  
  // Nuevos campos manuales
  const [tipoCreditoEditar, setTipoCreditoEditar] = useState<string>("EFECTIVO")
  const [diasGraciaEditar, setDiasGraciaEditar] = useState<string>("0")
  const [cuotasPagadasManualEditar, setCuotasPagadasManualEditar] = useState<string>("")
  const [cuotasAtrasadasManualEditar, setCuotasAtrasadasManualEditar] = useState<string>("")
  const [cuotasPendientesManualEditar, setCuotasPendientesManualEditar] = useState<string>("")
  const [diasVencidosManualEditar, setDiasVencidosManualEditar] = useState<string>("")
  const [valorEnAtrasoManualEditar, setValorEnAtrasoManualEditar] = useState<string>("")

  // Efecto para calcular el total y cuota en el modal de edición
  useEffect(() => {
    if (showEditarModal || showEditarBoletaModal) {
      const montoNum = parseFloat(montoEditar) || 0
      const valorSeguro = parseFloat(valorMicroseguroEditar) || 0
      const interesNum = parseFloat(interesEditar) || 0
      const cuotasNum = parseInt(cuotasEditar) || 1

      const montoConInteres = montoNum + (montoNum * interesNum / 100)
      
      let totalSeguro = 0
      if (tipoMicroseguroEditar === 'MONTO_FIJO') {
        totalSeguro = valorSeguro
      } else if (tipoMicroseguroEditar === 'PORCENTAJE') {
        totalSeguro = (montoNum * valorSeguro) / 100
      } else if (tipoMicroseguroEditar === 'DEVOLUCION') {
        totalSeguro = valorSeguro
      }

      const totalCalculado = tipoMicroseguroEditar === 'DEVOLUCION' 
        ? montoConInteres - totalSeguro 
        : montoConInteres + totalSeguro
      setMontoTotalEditar(totalCalculado)
      setCuotaEditar(totalCalculado / cuotasNum)
    }
  }, [montoEditar, tipoMicroseguroEditar, valorMicroseguroEditar, interesEditar, cuotasEditar, showEditarModal, showEditarBoletaModal])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      // Parseo manual de la cadena ISO (YYYY-MM-DD...) para evitar conversiones de zona horaria automáticas
      // Tomamos la parte de la fecha antes de la T
      const fechaIso = String(dateString).split('T')[0]
      if (fechaIso.includes('-')) {
        const [year, month, day] = fechaIso.split('-')
        // Construimos la fecha en UTC al mediodía (12:00) para evitar bordes de cambio de día
        const fecha = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0))
        return new Intl.DateTimeFormat('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        }).format(fecha)
      }
    } catch (e) {
      console.error("Error formateando fecha:", e)
    }

    // Fallback
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(date)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO')
  }

  const formatDateLocal = (dateString: string | Date | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  // Calcular totales
  const montoOriginal = Number(prestamo.monto)
  const interesAmount = (montoOriginal * Number(prestamo.interes)) / 100
  const microseguroAmount = Number(prestamo.microseguroTotal || 0)
  const montoTotal = montoOriginal + interesAmount + microseguroAmount
  const totalPagado = prestamo.pagos.reduce((sum: number, pago: Pago) =>
    sum + Number(pago.monto), 0
  )
  const saldoPendiente = Math.max(0, Math.round((montoTotal - totalPagado) * 100) / 100)
  const valorCuota = prestamo.valorCuota
  const prestamoFlex = prestamo as any
  const cuotasPagadas = (prestamoFlex.cuotasPagadasManual !== null && prestamoFlex.cuotasPagadasManual !== undefined)
    ? Number(prestamoFlex.cuotasPagadasManual)
    : (valorCuota > 0 ? totalPagado / valorCuota : 0)

  const progressPercentage = Math.min((totalPagado / montoTotal) * 100, 100)

  // Calcular información extendida del préstamo
  const calcularInformacionExtendida = () => {
    const hoy = new Date()
    // Normalizar a medianoche UTC
    const hoyMidnight = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0))

    // Interpretar fecha de inicio explícita de la base de datos como mediodía UTC
    const fechaInicioStr = String(prestamo.fechaInicio).split('T')[0]
    const [inicioYear, inicioMonth, inicioDay] = fechaInicioStr.split('-').map(Number)
    const fechaInicioMidnight = new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 12, 0, 0))

    const fechaFinStr = String(prestamo.fechaFin).split('T')[0]
    const [finYear, finMonth, finDay] = fechaFinStr.split('-').map(Number)
    const fechaFinMidnight = new Date(Date.UTC(finYear, finMonth - 1, finDay, 12, 0, 0))

    // 1. Calcular días transcurridos totales (incluyendo hoy si es día hábil)
    // 2. Calcular cuotas esperadas (todos los días hábiles previos a hoy)
    const oneDay = 1000 * 60 * 60 * 24
    let diasHabilesTotales = 0
    let cuotasEsperadas = 0

    if (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO') {
      let current = new Date(fechaInicioMidnight)
      current.setUTCDate(current.getUTCDate() + 1)

      while (current <= hoyMidnight) {
        const d = current.getUTCDay()
        let valid = true
        if (prestamo.tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
        if (prestamo.tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
        if (prestamo.tipoPago === 'DIARIO' && d === 0) valid = false

        if (valid) {
          diasHabilesTotales++
          if (current <= hoyMidnight) {
            cuotasEsperadas++
          }
        }
        current.setUTCDate(current.getUTCDate() + 1)
      }
    } else {
      // Lógica para pagos no diarios (Semanal, Quincenal, etc.)
      const totalDiasCalendario = Math.max(0, Math.floor((hoyMidnight.getTime() - fechaInicioMidnight.getTime()) / oneDay))
      diasHabilesTotales = totalDiasCalendario

      const diasPorTipo = {
        'SEMANAL': 7, 'QUINCENAL': 15, 'CATORCENAL': 14, 'FIN_DE_MES': 30,
        'MENSUAL': 30, 'TRIMESTRAL': 90, 'CUATRIMESTRAL': 120, 'SEMESTRAL': 180, 'ANUAL': 365
      }
      const diasPorCuota = diasPorTipo[prestamo.tipoPago as keyof typeof diasPorTipo] || 1

      // Para pagos periódicos, una cuota se espera cada X días.
      // Si han pasado 7 días y el pago es semanal, se espera 1 cuota (la del día 7)
      cuotasEsperadas = Math.floor(totalDiasCalendario / diasPorCuota)
    }

    // Usar el manual si existe, si no calcular
    const prestamoFlex = prestamo as any;
    const diasTranscurridos = prestamoFlex.diasTranscurridosManual !== null && prestamoFlex.diasTranscurridosManual !== undefined 
      ? prestamoFlex.diasTranscurridosManual 
      : diasHabilesTotales

    const cuotasPendientes = (prestamoFlex.cuotasPendientesManual !== null && prestamoFlex.cuotasPendientesManual !== undefined)
      ? Number(prestamoFlex.cuotasPendientesManual)
      : Math.max(0, prestamo.cuotas - cuotasPagadas)

    // Cuotas atrasadas (considerando días de gracia)
    const diasGracia = prestamo.diasGracia || 0
    const cuotasPagadasFinancial = (prestamoFlex.cuotasPagadasManual !== null && prestamoFlex.cuotasPagadasManual !== undefined)
      ? Number(prestamoFlex.cuotasPagadasManual)
      : (valorCuota > 0 ? totalPagado / valorCuota : 0)
    const cuotasAtrasadas = (prestamoFlex.cuotasAtrasadasManual !== null && prestamoFlex.cuotasAtrasadasManual !== undefined)
      ? Number(prestamoFlex.cuotasAtrasadasManual)
      : Math.max(0, cuotasEsperadas - cuotasPagadasFinancial)

    // Días vencidos
    let diasVencidos = 0
    let fechaReferenciaMora: Date | null = null

    if (hoyMidnight > fechaFinMidnight) {
      fechaReferenciaMora = fechaFinMidnight
    } else if (cuotasAtrasadas > 0) {
      // El atraso se cuenta desde el día que venció la primera cuota no pagada
      // Para simplificar y ser consistentes con el reporte del usuario:
      // Si debe 1 cuota, lleva 1 o más días vencido
      const proximaCuotaIdx = Math.floor(cuotasPagadasFinancial) + 1

      if (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO') {
        // Buscamos la fecha en que venció la cuota que le tocaba pagar (proximaCuotaIdx)
        let current = new Date(fechaInicioMidnight)
        let count = 0
        while (count < proximaCuotaIdx) {
          current.setUTCDate(current.getUTCDate() + 1)
          const d = current.getUTCDay()
          let valid = true
          if (prestamo.tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
          if (prestamo.tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
          if (prestamo.tipoPago === 'DIARIO' && d === 0) valid = false

          if (valid) {
            count++
          }
        }
        fechaReferenciaMora = current
      } else {
        const diasPorTipo = {
          'SEMANAL': 7, 'QUINCENAL': 15, 'CATORCENAL': 14, 'FIN_DE_MES': 30,
          'MENSUAL': 30, 'TRIMESTRAL': 90, 'CUATRIMESTRAL': 120, 'SEMESTRAL': 180, 'ANUAL': 365
        }
        const diasPorCuota = diasPorTipo[prestamo.tipoPago as keyof typeof diasPorTipo] || 1
        fechaReferenciaMora = new Date(fechaInicioMidnight.getTime() + (proximaCuotaIdx * diasPorCuota * oneDay))
      }
    }

    if (prestamoFlex.diasVencidosManual !== null && prestamoFlex.diasVencidosManual !== undefined) {
      diasVencidos = Number(prestamoFlex.diasVencidosManual)
    } else if (fechaReferenciaMora) {
      let diasHabilesVencidos = 0;
      let tempDate = new Date(fechaReferenciaMora);
      while (tempDate <= hoyMidnight) {
        const d = tempDate.getUTCDay();
        let esDiaValido = true;
        if (d === 0) esDiaValido = false; // Domingo nunca es válido
        if (prestamo.tipoPago === 'LUNES_A_VIERNES' && d === 6) esDiaValido = false; // Sábado tampoco si es Lunes a Viernes
        
        if (esDiaValido) diasHabilesVencidos++;
        tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      }
      diasVencidos = Math.max(0, diasHabilesVencidos - diasGracia);
    }

    // Valor en atrasos
    const valorEnAtrasos = (prestamoFlex.valorEnAtrasoManual !== null && prestamoFlex.valorEnAtrasoManual !== undefined)
      ? Number(prestamoFlex.valorEnAtrasoManual)
      : Math.max(0, Math.round((cuotasAtrasadas * valorCuota) * 100) / 100)

    // Último pago
    const ultimoPago = prestamo.pagos.length > 0
      ? prestamo.pagos.sort((a: Pago, b: Pago) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]
      : null

    // Fecha próximo pago
    let fechaProximoPago: Date | null = null
    if (cuotasPagadas < prestamo.cuotas) {
      if (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO') {
        const targetCuota = Math.floor(cuotasPagadas) + 1
        let current = new Date(fechaInicioMidnight)
        let count = 0

        while (count < targetCuota) {
          current.setUTCDate(current.getUTCDate() + 1)
          const d = current.getUTCDay()
          let valid = true
          if (prestamo.tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
          if (prestamo.tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
          if (prestamo.tipoPago === 'DIARIO' && d === 0) valid = false

          if (valid) {
            count++
          }
        }
        fechaProximoPago = current
      } else {
        // Lógica estándar para otros tipos
        const diasPorTipo = {
          'SEMANAL': 7, 'QUINCENAL': 15, 'CATORCENAL': 14, 'FIN_DE_MES': 30,
          'MENSUAL': 30, 'TRIMESTRAL': 90, 'CUATRIMESTRAL': 120, 'SEMESTRAL': 180, 'ANUAL': 365
        }
        const diasPorCuota = diasPorTipo[prestamo.tipoPago as keyof typeof diasPorTipo] || 1
        fechaProximoPago = new Date(fechaInicioMidnight.getTime() + ((Math.floor(cuotasPagadas) + 1) * diasPorCuota * oneDay))
      }

      // Si la fecha calculada quedó en el pasado, la actualizamos para que tenga sentido operativo
      if (fechaProximoPago < hoyMidnight) {
        let proximaFechalogica = new Date(hoyMidnight);
        
        // Si el cobrador RECIÉN registró un pago hoy en la aplicación (sin importar si lo anotó con fecha de ayer)
        let interaccionHoy = false;
        if (ultimoPago) {
          // Buscamos si algún pago se ingresó físicamente HOY en el sistema (usando UTC-5 para precisión total)
          const pagoFisicoDeHoy = prestamo.pagos.find(p => {
             if (p.createdAt) {
               const cDate = new Date(new Date(p.createdAt).getTime() - (5 * 60 * 60 * 1000));
               const hDate = new Date(Date.now() - (5 * 60 * 60 * 1000));
               return cDate.toISOString().split('T')[0] === hDate.toISOString().split('T')[0];
             }
             return false;
          });
          
          if (pagoFisicoDeHoy) {
            interaccionHoy = true;
          } else {
             // Fallback usando UTC-5 manual para asegurar que "Hoy" es verdaderamente hoy en Latinoamérica
             const hDate = new Date(Date.now() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
             const pDateStr = new Date(new Date(ultimoPago.fecha).getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
             if (pDateStr === hDate) interaccionHoy = true;
          }
        }

        if (interaccionHoy && (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO')) {
          proximaFechalogica.setUTCDate(proximaFechalogica.getUTCDate() + 1);
          let valid = false;
          while (!valid) {
            const d = proximaFechalogica.getUTCDay();
            valid = true;
            if (prestamo.tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false;
            if (prestamo.tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false;
            if (prestamo.tipoPago === 'DIARIO' && d === 0) valid = false;
            if (!valid) proximaFechalogica.setUTCDate(proximaFechalogica.getUTCDate() + 1);
          }
        } else if (interaccionHoy) {
            proximaFechalogica.setUTCDate(proximaFechalogica.getUTCDate() + 1);
        }
        
        fechaProximoPago = proximaFechalogica;
      }
    }
    
    // Si hay un override manual explícito, lo usamos e ignoramos toda la lógica anterior
    const prestamoFlex2 = prestamo as any;
    if (prestamoFlex2.fechaProximoPagoManual) {
      fechaProximoPago = new Date(prestamoFlex2.fechaProximoPagoManual)
    }

    // Calcular valores puramente automáticos (sin overrides manuales) para placeholders
    const cuotasPagadasAuto = valorCuota > 0 ? totalPagado / valorCuota : 0
    const cuotasAtrasadasAuto = Math.max(0, cuotasEsperadas - cuotasPagadasAuto)
    const cuotasPendientesAuto = Math.max(0, prestamo.cuotas - cuotasPagadasAuto)
    
    let diasVencidosAuto = 0
    let fechaReferenciaMoraAuto: Date | null = null
    if (hoyMidnight > fechaFinMidnight) {
      fechaReferenciaMoraAuto = fechaFinMidnight
    } else if (cuotasAtrasadasAuto > 0) {
      const proximaCuotaIdxAuto = Math.floor(cuotasPagadasAuto) + 1
      if (prestamo.tipoPago === 'LUNES_A_SABADO' || prestamo.tipoPago === 'LUNES_A_VIERNES' || prestamo.tipoPago === 'DIARIO') {
        let current = new Date(fechaInicioMidnight)
        let count = 0
        while (count < proximaCuotaIdxAuto) {
          current.setUTCDate(current.getUTCDate() + 1)
          const d = current.getUTCDay()
          let valid = true
          if (prestamo.tipoPago === 'LUNES_A_SABADO' && d === 0) valid = false
          if (prestamo.tipoPago === 'LUNES_A_VIERNES' && (d === 0 || d === 6)) valid = false
          if (prestamo.tipoPago === 'DIARIO' && d === 0) valid = false
          if (valid) count++
        }
        fechaReferenciaMoraAuto = current
      } else {
        const diasPorTipo = {
          'SEMANAL': 7, 'QUINCENAL': 15, 'CATORCENAL': 14, 'FIN_DE_MES': 30,
          'MENSUAL': 30, 'TRIMESTRAL': 90, 'CUATRIMESTRAL': 120, 'SEMESTRAL': 180, 'ANUAL': 365
        }
        const diasPorCuota = diasPorTipo[prestamo.tipoPago as keyof typeof diasPorTipo] || 1
        fechaReferenciaMoraAuto = new Date(fechaInicioMidnight.getTime() + (proximaCuotaIdxAuto * diasPorCuota * oneDay))
      }
    }

    if (fechaReferenciaMoraAuto) {
      let diasHabilesVencidosAuto = 0
      let tempDate = new Date(fechaReferenciaMoraAuto)
      while (tempDate <= hoyMidnight) {
        const d = tempDate.getUTCDay()
        let esDiaValido = true
        if (d === 0) esDiaValido = false
        if (prestamo.tipoPago === 'LUNES_A_VIERNES' && d === 6) esDiaValido = false
        if (esDiaValido) diasHabilesVencidosAuto++
        tempDate.setUTCDate(tempDate.getUTCDate() + 1)
      }
      diasVencidosAuto = Math.max(0, diasHabilesVencidosAuto - (prestamo.diasGracia || 0))
    }

    const valorEnAtrasoAuto = Math.max(0, Math.round((cuotasAtrasadasAuto * valorCuota) * 100) / 100)

    return {
      diasTranscurridos,
      cuotasPendientes,
      cuotasAtrasadas,
      diasVencidos,
      valorEnAtrasos,
      ultimoPago,
      fechaProximoPago,
      diasGracia: prestamo.diasGracia || 0,
      cuotasPagadasAuto,
      cuotasAtrasadasAuto,
      cuotasPendientesAuto,
      diasVencidosAuto,
      valorEnAtrasoAuto
    }
  }

  const infoExtendida = calcularInformacionExtendida()

  const prestamoFormatted = {
    id: prestamo.id,
    monto: montoOriginal,
    interes: prestamo.interes,
    cuotas: prestamo.cuotas,
    valorCuota,
    fechaInicio: prestamo.fechaInicio,
    fechaFin: prestamo.fechaFin,
    estado: prestamo.estado,
    cliente: {
      id: prestamo.cliente.id,
      codigoCliente: prestamo.cliente.codigoCliente,
      documento: prestamo.cliente.documento,
      nombre: prestamo.cliente.nombre,
      apellido: prestamo.cliente.apellido,
      direccionCliente: prestamo.cliente.direccionCliente,
      direccionCobro: prestamo.cliente.direccionCobro,
      telefono: prestamo.cliente.telefono,
      foto: prestamo.cliente.foto
    },
    saldoPendiente,
    cuotasPagadas,
    montoTotal
  }

  const onPagoSuccess = () => {
    setShowPagoModal(false)
    toast({
      title: "Pago registrado",
      description: "El pago se ha registrado exitosamente",
    })
    // Recargar la página para mostrar los datos actualizados
    window.location.reload()
  }

  const onPhotoSaved = () => {
    setShowCameraModal(false)
    // Recargar la página para mostrar la foto actualizada
    window.location.reload()
  }

  const abrirImagenModal = () => {
    if (prestamo.cliente.foto) {
      setSelectedImage({
        url: prestamo.cliente.foto,
        title: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
        subtitle: `Código: ${prestamo.cliente.codigoCliente} • Doc: ${prestamo.cliente.documento}`
      })
      setShowImageModal(true)
    }
  }

  const handleDeletePrestamo = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/prestamos/${prestamo.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Préstamo eliminado",
          description: `El préstamo ha sido eliminado exitosamente. Se eliminaron ${data.deletedPayments} pagos asociados.`,
        })
        // Redirigir al listado general
        router.push('/listado-general')
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "No se pudo eliminar el préstamo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar préstamo:", error)
      toast({
        title: "Error",
        description: "Error de conexión al eliminar el préstamo",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "ACTIVO":
        return <Badge className="bg-green-500">Activo</Badge>
      case "CANCELADO":
        return <Badge className="bg-gray-500">Cancelado</Badge>
      case "VENCIDO":
        return <Badge className="bg-red-500">Vencido</Badge>
      case "RENOVADO":
        return <Badge className="bg-blue-500">Refinanciado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getTipoPagoText = (tipo: string) => {
    switch (tipo) {
      case "DIARIO": return "Diario"
      case "SEMANAL": return "Semanal"
      case "LUNES_A_VIERNES": return "Lunes a Viernes"
      case "LUNES_A_SABADO": return "Lunes a Sábado"
      case "QUINCENAL": return "Quincenal"
      case "CATORCENAL": return "Catorcenal"
      case "FIN_DE_MES": return "Fin de Mes"
      case "MENSUAL": return "Mensual"
      case "TRIMESTRAL": return "Trimestral"
      case "CUATRIMESTRAL": return "Cuatrimestral"
      case "SEMESTRAL": return "Semestral"
      case "ANUAL": return "Anual"
      default: return tipo
    }
  }

  const getTipoCreditoText = (tipo: string) => {
    switch (tipo) {
      case "EFECTIVO": return "Efectivo"
      case "TRANSFERENCIA": return "Transferencia"
      default: return tipo
    }
  }

  // Función para calcular el estado de alerta del préstamo
  // Función para calcular el estado de alerta del préstamo
  const calcularEstadoPrestamo = () => {
    // Si ya está completamente pagado
    if (saldoPendiente <= 0) {
      return {
        estado: 'COMPLETADO',
        icono: CheckCircle,
        color: 'bg-green-500',
        texto: 'Préstamo Completado',
        colorTexto: 'text-white'
      }
    }

    // Verificar si el préstamo está completamente vencido por fecha
    const fechaFinStr = String(prestamo.fechaFin).split('T')[0]
    const [finYear, finMonth, finDay] = fechaFinStr.split('-').map(Number)
    const fechaFinMidnight = new Date(finYear, finMonth - 1, finDay)
    const hoy = new Date()
    const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

    if (prestamo.estado === 'VENCIDO' || fechaFinMidnight < hoyMidnight) {
      return {
        estado: 'VENCIDO',
        icono: XCircle,
        color: 'bg-red-500',
        texto: 'Préstamo Vencido',
        colorTexto: 'text-white'
      }
    }

    // Verificar morosidad usando la info extendida ya calculada
    // infoExtendida ya maneja la lógica de días hábiles, exclusión de hoy, y timezone correcto
    if (infoExtendida.cuotasAtrasadas > 0) {
      return {
        estado: 'MOROSO',
        icono: AlertTriangle,
        color: 'bg-orange-500',
        texto: 'Pagos Atrasados',
        colorTexto: 'text-white'
      }
    }

    // Verificar si está próximo a vencer (próximo pago en 3 días)
    if (infoExtendida.fechaProximoPago) {
      const fechaProximo = new Date(infoExtendida.fechaProximoPago)
      const fechaProximoMidnight = new Date(fechaProximo.getFullYear(), fechaProximo.getMonth(), fechaProximo.getDate())

      const diffTime = fechaProximoMidnight.getTime() - hoyMidnight.getTime()
      const diferenciaDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diferenciaDias <= 3 && diferenciaDias >= 0) {
        return {
          estado: 'PROXIMO_A_VENCER',
          icono: Clock,
          color: 'bg-yellow-500',
          texto: 'Próximo Pago Cerca',
          colorTexto: 'text-white'
        }
      }
    }

    // Cliente al día
    return {
      estado: 'OK',
      icono: CheckCircle,
      color: 'bg-green-500',
      texto: 'Pagos al Día',
      colorTexto: 'text-white'
    }
  }

  const estadoAlerta = calcularEstadoPrestamo()
  const IconoAlerta = estadoAlerta.icono

  // Función para abrir Google Maps con la dirección
  const abrirMapa = (direccion: string, tipo: string, mapLink?: string | null) => {
    // Si hay un mapLink, abrirlo directamente
    if (mapLink && mapLink.startsWith('http')) {
      window.open(mapLink, '_blank')
      return
    }

    // Si la dirección ya es un enlace de Google Maps, abrirlo directamente
    if (direccion.startsWith('http')) {
      window.open(direccion, '_blank')
    } else {
      const direccionFormateada = encodeURIComponent(direccion)
      const url = `https://www.google.com/maps/search/?api=1&query=${direccionFormateada}`
      window.open(url, '_blank')
    }
  }

  // Función para compartir por WhatsApp
  const compartirPorWhatsApp = () => {
    const mensaje = `
📋 *Información de Préstamo*

👤 *Cliente:* ${prestamo.cliente.nombre} ${prestamo.cliente.apellido}
📄 *Documento:* ${prestamo.cliente.documento}
💰 *Monto Prestado:* ${formatCurrency(montoOriginal)}
💵 *Total Pagado:* ${formatCurrency(totalPagado)}
⚠️ *Saldo Pendiente:* ${formatCurrency(saldoPendiente)}
📊 *Valor Cuota:* ${formatCurrency(valorCuota)}
📅 *Cuotas Pagadas:* ${cuotasPagadas} de ${prestamo.cuotas}
📈 *Progreso:* ${progressPercentage.toFixed(1)}%
🎯 *Estado:* ${prestamo.estado}
📞 *Teléfono:* ${prestamo.cliente.telefono || 'No registrado'}
`.trim()

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  // Cargar transferencias
  const cargarTransferencias = async () => {
    try {
      const response = await fetch(`/api/transferencias?prestamoId=${prestamo.id}`)
      if (response.ok) {
        const data = await response.json()
        setTransferencias(data)
      }
    } catch (error) {
      console.error("Error al cargar transferencias:", error)
    }
  }

  // Usar useEffect para cargar transferencias al montar el componente
  useEffect(() => {
    cargarTransferencias()
  }, [])

  // Función para construir la data de la boleta y mostrar el modal
  const handleVerBoletaPago = (pago: Pago) => {
    // 1. Calcular saldo pendiente HASTA este pago
    // Ordenamos pagos por fecha para asegurar consistencia
    const pagosSorted = [...prestamo.pagos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    // Encontramos el índice de este pago
    const index = pagosSorted.findIndex(p => p.id === pago.id)

    // Sumamos todos los pagos hasta este (inclusive)
    let totalPagadoHastaEste = 0
    if (index !== -1) {
      totalPagadoHastaEste = pagosSorted.slice(0, index + 1).reduce((sum, p) => sum + Number(p.monto), 0)
    }

    const saldoPendienteEnEseMomento = Math.max(0, montoTotal - totalPagadoHastaEste)

    // Pago anterior
    const ultimoPagoAnterior = index > 0 ? {
      fecha: pagosSorted[index - 1].fecha,
      monto: Number(pagosSorted[index - 1].monto)
    } : undefined

    // Construir objeto BoletaPagoData
    const boletaData = {
      id: pago.id,
      monto: Number(pago.monto),
      fecha: pago.fecha,
      observaciones: pago.observaciones,
      metodoPago: pago.metodoPago,
      fotoComprobante: (pago as any).fotoComprobante || null,
      fotoMiniatura: (pago as any).fotoMiniatura || null,
      numeroBoleta: `BOL-${String(pago.id).padStart(6, '0')}`,
      prestamo: {
        id: prestamo.id,
        monto: montoOriginal,
        interes: prestamo.interes,
        valorCuota: valorCuota,
        montoTotal: montoTotal,
        saldoPendiente: saldoPendienteEnEseMomento, // Saldo DESPUÉS de este pago
        fechaInicio: prestamo.fechaInicio,
        tipoPago: prestamo.tipoPago,
        cuotas: prestamo.cuotas,
        microseguroTipo: prestamo.microseguroTipo,
        microseguroValor: prestamo.microseguroValor,
        microseguroTotal: prestamo.microseguroTotal,
        ultimoPago: ultimoPagoAnterior
      },
      cliente: {
        nombre: prestamo.cliente.nombre,
        apellido: prestamo.cliente.apellido,
        documento: prestamo.cliente.documento,
        telefono: prestamo.cliente.telefono,
        direccionCliente: prestamo.cliente.direccionCliente
      },
      usuario: {
        nombre: pago.usuario?.firstName && pago.usuario?.lastName
          ? `${pago.usuario.firstName} ${pago.usuario.lastName}`
          : pago.usuario?.name || "Usuario"
      },
      tipoCredito: prestamo.tipoCredito?.toLowerCase() || 'efectivo',
      tipoPagoMetodo: pago.metodoPago.toLowerCase()
    }

    setSelectedBoletaData(boletaData)
    setShowBoletaModal(true)
  }

  const handleDeletePago = async (pagoId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este pago? Esta acción revertirá el saldo.")) {
      return
    }

    try {
      const response = await fetch(`/api/pagos/${pagoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Pago eliminado",
          description: "El pago ha sido eliminado y el saldo actualizado.",
        })
        // Recargar la página para mostrar los datos actualizados
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "No se pudo eliminar el pago",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar pago:", error)
      toast({
        title: "Error",
        description: "Error de conexión al eliminar el pago",
        variant: "destructive",
      })
    }
  }

  const handleVerBoletaTransferencia = async (transferencia: Transferencia) => {
    if (!transferencia.observaciones) return

    // Intentamos buscar el pago asociado a esta transferencia para tener el ID correcto
    // Normalmente la transferencia se crea junto con un pago.
    // Podemos buscar en los pagos uno que coincida en monto y fecha aproximada, o referencia.
    // Como simplificación por ahora, construiremos la boleta con los datos de la transferencia,
    // asumiendo que el ID de la transferencia puede servir para generar un número de boleta visual,
    // o idealmente deberíamos haber guardado el pagoId en la transferencia.

    // Búsqueda simple del pago correspondiente en la lista de pagos cargada
    const pagoAsociado = prestamo.pagos.find(p =>
      p.monto === transferencia.monto &&
      new Date(p.fecha).getTime() === new Date(transferencia.fecha).getTime()
    )

    if (pagoAsociado) {
      handleVerBoletaPago(pagoAsociado)
    } else {
      // Fallback si no encontramos el pago exacto (ej: diferencias de ms en fecha)
      toast({
        title: "Información",
        description: "No se encontró el pago asociado exacto para generar la boleta completa.",
      })
    }
  }

  const handleDeleteTransferencia = async (transferenciaId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta transferencia? Esta acción revertirá el saldo del préstamo.")) {
      return
    }

    try {
      const response = await fetch(`/api/transferencias/${transferenciaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Transferencia eliminada",
          description: "La transferencia y su pago asociado han sido eliminados del registro.",
        })
        // Recargar la página para mostrar los datos actualizados
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "No se pudo eliminar la transferencia",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar transferencia:", error)
      toast({
        title: "Error",
        description: "Error de conexión al eliminar la transferencia",
        variant: "destructive",
      })
    }
  }

  const onTransferenciaSaved = () => {
    setShowTransferenciaModal(false)
    cargarTransferencias() // Recargar transferencias
    router.refresh() // Recargar datos del servidor (balance, pagos, etc.)
    toast({
      title: "Transferencia registrada",
      description: "La transferencia y el pago se han registrado exitosamente",
    })
  }

  // Función para manejar la renovación de crédito
  const handleRenovarCredito = (tipo: "REFINANCIAMIENTO" | "RENOVACION" = "REFINANCIAMIENTO") => {
    setTipoOperacion(tipo)
    setMontoRenovacion("")
    setInteresRenovacion(prestamo.interes.toString())
    setTipoPagoRenovacion(prestamo.tipoPago)
    setCuotasRenovacion(prestamo.cuotas.toString())
    setShowRenovacionModal(true)
  }

  const handleSubmitRenovacion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!montoRenovacion || !interesRenovacion || !cuotasRenovacion) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados",
        variant: "destructive",
      })
      return
    }

    const montoNum = parseFloat(montoRenovacion)
    const interesNum = parseFloat(interesRenovacion)
    const cuotasNum = parseInt(cuotasRenovacion)

    if (montoNum < saldoPendiente) {
      toast({
        title: "Error",
        description: "El monto de renovación debe ser mayor o igual al saldo pendiente actual",
        variant: "destructive",
      })
      return
    }

    if (montoNum <= 0 || interesNum < 0 || cuotasNum <= 0) {
      toast({
        title: "Error",
        description: "Los valores deben ser válidos y positivos",
        variant: "destructive",
      })
      return
    }

    setRenovando(true)
    try {
      // Calcular microseguro total para la renovación
      const microseguroValorNum = parseFloat(valorMicroseguroRenovacion) || 0
      let microseguroTotal = 0
      if (tipoMicroseguroRenovacion === 'MONTO_FIJO') {
        microseguroTotal = microseguroValorNum
      } else if (tipoMicroseguroRenovacion === 'PORCENTAJE') {
        microseguroTotal = (montoNum * microseguroValorNum) / 100
      }

      const response = await fetch(`/api/prestamos/${prestamo.id}/renovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: montoNum,
          interes: interesNum,
          tipoPago: tipoPagoRenovacion,
          cuotas: cuotasNum,
          fechaInicio: fechaInicioRenovacion,
          observaciones: observacionesRenovacion.trim() || undefined,
          microseguroTipo: tipoMicroseguroRenovacion,
          microseguroValor: microseguroValorNum,
          microseguroTotal: microseguroTotal,
          tipoOperacion: tipoOperacion
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: tipoOperacion === 'RENOVACION' ? "Crédito renovado" : "Crédito refinanciado",
          description: `El crédito se ha ${tipoOperacion === 'RENOVACION' ? 'renovado' : 'refinanciado'} exitosamente. Nuevo ID: ${result.prestamoNuevo.id.slice(-6).toUpperCase()}`,
        })

        // Cerrar modal y redirigir al nuevo préstamo
        setShowRenovacionModal(false)
        router.push(`/prestamos/${result.prestamoNuevo.id}`)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || `No se pudo ${tipoOperacion === 'RENOVACION' ? 'renovar' : 'refinanciar'} el crédito`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setRenovando(false)
    }
  }

  const handleCancelRenovacion = () => {
    setShowRenovacionModal(false)
    // Limpiar formulario
    setMontoRenovacion("")
    setInteresRenovacion("")
    setTipoPagoRenovacion("DIARIO")
    setCuotasRenovacion("")
    setTipoMicroseguroRenovacion("NINGUNO")
    setValorMicroseguroRenovacion("0")
    setFechaInicioRenovacion(new Date().toISOString().split('T')[0])
    setObservacionesRenovacion("")
  }

  // Calcular valores para mostrar en el modal
  const calcularRenovacion = () => {
    const montoNum = parseFloat(montoRenovacion) || 0
    const interesNum = parseFloat(interesRenovacion) || 0
    const cuotasNum = parseInt(cuotasRenovacion) || 1
    const microseguroValorNum = parseFloat(valorMicroseguroRenovacion) || 0
    
    // Calcular microseguro total para la renovación
    let microseguroTotal = 0
    if (tipoMicroseguroRenovacion === 'MONTO_FIJO') {
      microseguroTotal = microseguroValorNum
    } else if (tipoMicroseguroRenovacion === 'PORCENTAJE') {
      microseguroTotal = (montoNum * microseguroValorNum) / 100
    }

    const montoEfectivo = montoNum - saldoPendiente
    const montoConInteresYSeguro = montoNum * (1 + interesNum / 100) + microseguroTotal
    const valorCuotaNueva = montoConInteresYSeguro / cuotasNum

    return {
      montoEfectivo: Math.max(0, montoEfectivo),
      montoConInteres: montoConInteresYSeguro,
      valorCuotaNueva,
      descuento: saldoPendiente
    }
  }

  // Función para manejar la edición de cliente
  const handleEditarCliente = () => {
    // Pre-llenar los campos con los valores actuales del cliente
    setNombreEditar(prestamo.cliente.nombre || "")
    setApellidoEditar(prestamo.cliente.apellido || "")
    setDocumentoEditar(prestamo.cliente.documento || "")
    setTelefonoEditar(prestamo.cliente.telefono || "")
    setDireccionClienteEditar(prestamo.cliente.direccionCliente || "")
    setDireccionCobroEditar(prestamo.cliente.direccionCobro || "")
    
    setShowEditarModal(true)
  }

  const handleSubmitEdicion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombreEditar.trim() || !apellidoEditar.trim() || !documentoEditar.trim()) {
      toast({
        title: "Error",
        description: "Nombre, apellido y documento son obligatorios",
        variant: "destructive",
      })
      return
    }

    setEditando(true)
    try {
      const clienteUpdateResponse = await fetch(`/api/clientes/${prestamo.cliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreEditar.trim(),
          apellido: apellidoEditar.trim(),
          documento: documentoEditar.trim(),
          telefono: telefonoEditar.trim() || null,
          direccionCliente: direccionClienteEditar.trim() || null,
          direccionCobro: direccionCobroEditar.trim() || null
        }),
      })

      if (!clienteUpdateResponse.ok) {
        const error = await clienteUpdateResponse.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo actualizar el cliente",
          variant: "destructive",
        })
        setEditando(false)
        return
      }

      toast({
        title: "Datos actualizados",
        description: "La información del cliente ha sido actualizada exitosamente",
      })

      // Cerrar modal y recargar la página
      setShowEditarModal(false)
      window.location.reload()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setEditando(false)
    }
  }

  const handleCancelEdicion = () => {
    setShowEditarModal(false)
    // Limpiar formulario
    setNombreEditar("")
    setApellidoEditar("")
    setDocumentoEditar("")
    setTelefonoEditar("")
    setDireccionClienteEditar("")
    setDireccionCobroEditar("")
  }

  // Función para manejar la edición de la boleta/préstamo
  const handleEditarBoleta = () => {
    setMontoEditar(prestamo.monto.toString())
    setInteresEditar(prestamo.interes.toString())
    setTipoPagoEditar(prestamo.tipoPago)
    setCuotasEditar(prestamo.cuotas.toString())
    setTipoMicroseguroEditar(prestamo.microseguroTipo)
    setValorMicroseguroEditar(prestamo.microseguroValor?.toString() || "0")
    
    // Obtener la fecha en formato YYYY-MM-DD para los inputs type="date"
    try {
      if (prestamo.fechaInicio) {
        const d = new Date(prestamo.fechaInicio);
        setFechaInicioEditar(d.toISOString().split('T')[0]);
      }
      
      // Intentar setear valores manuales u originales (sólo base visual)
      const prestamoFlex3 = prestamo as any;
      if (prestamoFlex3.fechaFinManual) {
        setFechaFinEditar(new Date(prestamoFlex3.fechaFinManual).toISOString().split('T')[0])
      } else if (prestamo.fechaFin) {
         setFechaFinEditar(new Date(prestamo.fechaFin).toISOString().split('T')[0])
      } else {
         setFechaFinEditar("")
      }

      setDiasTranscurridosEditar(prestamoFlex3.diasTranscurridosManual?.toString() || "")
      setFechaProximoPagoEditar(prestamoFlex3.fechaProximoPagoManual ? new Date(prestamoFlex3.fechaProximoPagoManual).toISOString().split('T')[0] : "")
      
      // Inicializar nuevos campos
      setTipoCreditoEditar(prestamo.tipoCredito)
      setDiasGraciaEditar(prestamo.diasGracia?.toString() || "0")
      setCuotasPagadasManualEditar(prestamoFlex3.cuotasPagadasManual?.toString() || "")
      setCuotasAtrasadasManualEditar(prestamoFlex3.cuotasAtrasadasManual?.toString() || "")
      setCuotasPendientesManualEditar(prestamoFlex3.cuotasPendientesManual?.toString() || "")
      setDiasVencidosManualEditar(prestamoFlex3.diasVencidosManual?.toString() || "")
      setValorEnAtrasoManualEditar(prestamoFlex3.valorEnAtrasoManual?.toString() || "")

    } catch (e) {
      setFechaInicioEditar("");
      setFechaFinEditar("");
      setDiasTranscurridosEditar("");
      setFechaProximoPagoEditar("");
      setTipoCreditoEditar("EFECTIVO");
      setDiasGraciaEditar("0");
      setCuotasPagadasManualEditar("");
      setCuotasAtrasadasManualEditar("");
      setCuotasPendientesManualEditar("");
      setDiasVencidosManualEditar("");
      setValorEnAtrasoManualEditar("");
    }
    
    setShowEditarBoletaModal(true)
  }

  const handleSubmitEditarBoleta = async (e: React.FormEvent) => {
    e.preventDefault()

    const montoNum = parseFloat(montoEditar)
    const interesNum = parseFloat(interesEditar)
    const cuotasNum = parseInt(cuotasEditar)
    const microseguroValorNum = parseFloat(valorMicroseguroEditar) || 0

    if (isNaN(montoNum) || montoNum <= 0 || isNaN(interesNum) || interesNum < 0 || isNaN(cuotasNum) || cuotasNum <= 0) {
      toast({
        title: "Error",
        description: "Monto, interés y cuotas deben ser números válidos mayores a cero",
        variant: "destructive",
      })
      return
    }

    setEditando(true)
    try {
      // Calcular microseguro total
      let microseguroTotal = 0
      if (tipoMicroseguroEditar === 'MONTO_FIJO') {
        microseguroTotal = microseguroValorNum
      } else if (tipoMicroseguroEditar === 'PORCENTAJE') {
        microseguroTotal = (montoNum * microseguroValorNum) / 100
      }
      
      // Reconstruir fecha manteniendo el formato UTC al mediodía para evitar saltos (igual que en creación)
      let fechaInicioAEnviar : string | Date = prestamo.fechaInicio;
      if (fechaInicioEditar) {
        const [y, m, d] = fechaInicioEditar.split('-').map(Number);
        fechaInicioAEnviar = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
      }

      let fechaFinManualObj = undefined;
      if (fechaFinEditar) {
        const [fy, fm, fd] = fechaFinEditar.split('-').map(Number);
        fechaFinManualObj = new Date(Date.UTC(fy, fm - 1, fd, 12, 0, 0, 0));
      }

      let fechaProximoPagoManualObj = undefined;
      if (fechaProximoPagoEditar) {
        const [py, pm, pd] = fechaProximoPagoEditar.split('-').map(Number);
        fechaProximoPagoManualObj = new Date(Date.UTC(py, pm - 1, pd, 12, 0, 0, 0));
      }

      const prestamoUpdateResponse = await fetch(`/api/prestamos/${prestamo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monto: montoNum,
          interes: interesNum,
          tipoPago: tipoPagoEditar,
          cuotas: cuotasNum,
          fechaInicio: fechaInicioAEnviar,
          fechaFinManual: fechaFinManualObj,
          diasTranscurridosManual: diasTranscurridosEditar || null,
          fechaProximoPagoManual: fechaProximoPagoManualObj,
          observaciones: prestamo.observaciones,
          microseguroTipo: tipoMicroseguroEditar,
          microseguroValor: microseguroValorNum,
          microseguroTotal: microseguroTotal,
          // Nuevos campos
          tipoCredito: tipoCreditoEditar,
          diasGracia: diasGraciaEditar,
          cuotasPagadasManual: cuotasPagadasManualEditar || null,
          cuotasAtrasadasManual: cuotasAtrasadasManualEditar || null,
          cuotasPendientesManual: cuotasPendientesManualEditar || null,
          diasVencidosManual: diasVencidosManualEditar || null,
          valorEnAtrasoManual: valorEnAtrasoManualEditar || null
        }),
      })

      if (!prestamoUpdateResponse.ok) {
        const error = await prestamoUpdateResponse.json()
        toast({
          title: "Error",
          description: error.error || "No se pudo actualizar la boleta del préstamo",
          variant: "destructive",
        })
        setEditando(false)
        return
      }

      toast({
        title: "Boleta actualizada",
        description: "La información de la boleta ha sido actualizada exitosamente",
      })

      // Cerrar modal y recargar la página
      setShowEditarBoletaModal(false)
      window.location.reload()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setEditando(false)
    }
  }

  const handleCancelEditarBoleta = () => {
    setShowEditarBoletaModal(false)
    // Limpiar formulario
    setMontoEditar("")
    setInteresEditar("")
    setTipoPagoEditar("")
    setCuotasEditar("")
    setFechaInicioEditar("")
    setFechaFinEditar("")
    setDiasTranscurridosEditar("")
    setFechaProximoPagoEditar("")
    setTipoCreditoEditar("EFECTIVO")
    setDiasGraciaEditar("0")
    setCuotasPagadasManualEditar("")
    setCuotasAtrasadasManualEditar("")
    setCuotasPendientesManualEditar("")
    setDiasVencidosManualEditar("")
    setValorEnAtrasoManualEditar("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/listado-general">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Detalle del Préstamo</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        <div className="space-y-6">
          {/* Información del cliente */}
          <Card className="animate-fadeInScale">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>Información del Cliente</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Badge de estado de alerta */}
                  <Badge
                    className={`text-xs ${estadoAlerta.color} ${estadoAlerta.colorTexto} hover:opacity-80 ${estadoAlerta.estado === 'MOROSO' || estadoAlerta.estado === 'VENCIDO' ? 'animate-pulse' : ''
                      }`}
                  >
                    <IconoAlerta className="h-3 w-3 mr-1" />
                    {estadoAlerta.texto}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCameraModal(true)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Foto</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3 sm:space-x-4 w-full">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex flex-col items-center justify-center flex-shrink-0">
                  {prestamo.cliente.foto ? (
                    <button
                      onClick={abrirImagenModal}
                      className="w-full h-full rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                      title="Ver foto del cliente"
                    >
                      <img
                        src={prestamo.cliente.foto}
                        alt={`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                  {/* Ícono de alerta superpuesto */}
                  <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${estadoAlerta.color}`}>
                    <IconoAlerta className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2 w-full">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate w-full" title={`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}>
                      {prestamo.cliente.nombre} {prestamo.cliente.apellido}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-100 text-blue-800 whitespace-nowrap self-start sm:self-auto shrink-0"
                    >
                      {getTipoPagoText(prestamo.tipoPago)}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="font-medium">Código:</span>
                      <span className="ml-1">{prestamo.cliente.codigoCliente}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="font-medium">Documento:</span>
                      <span className="ml-1">{prestamo.cliente.documento}</span>
                    </div>

                    {/* Dirección del Cliente */}
                    <div className="flex items-start text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-700 mb-1">Dirección Cliente:</div>
                        <button
                          onClick={() => abrirMapa(prestamo.cliente.direccionCliente, 'cliente', prestamo.cliente.mapLink)}
                          className="text-blue-600 hover:underline hover:text-blue-800 text-left leading-tight break-words w-full"
                          title="Click para abrir en Google Maps"
                        >
                          {prestamo.cliente.direccionCliente}
                        </button>
                      </div>
                    </div>

                    {/* Dirección de Cobro (si existe) */}
                    {prestamo.cliente.direccionCobro && (
                      <div className="flex items-start text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-orange-700 mb-1">Dirección Cobro:</div>
                          <button
                            onClick={() => abrirMapa(prestamo.cliente.direccionCobro!, 'cobro')}
                            className="text-blue-600 hover:underline hover:text-blue-800 text-left leading-tight break-words w-full"
                            title="Click para abrir en Google Maps"
                          >
                            {prestamo.cliente.direccionCobro}
                          </button>
                        </div>
                      </div>
                    )}

                    {prestamo.cliente.telefono && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <a
                          href={`tel:${prestamo.cliente.telefono}`}
                          className="text-blue-600 hover:underline"
                        >
                          {prestamo.cliente.telefono}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del préstamo */}
          <Card className="animate-fadeInScale" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Información del Préstamo</span>
                </div>
                {getEstadoBadge(prestamo.estado)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg overflow-hidden flex flex-col justify-center">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate w-full" title={formatCurrency(montoOriginal)}>
                    {formatCurrency(montoOriginal)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Monto Prestado</div>
                </div>

                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg overflow-hidden flex flex-col justify-center">
                  <div className="text-lg sm:text-2xl font-bold text-green-600 truncate w-full" title={formatCurrency(totalPagado)}>
                    {formatCurrency(totalPagado)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Pagado</div>
                </div>

                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg overflow-hidden flex flex-col justify-center">
                  <div className="text-lg sm:text-2xl font-bold text-red-600 truncate w-full" title={formatCurrency(saldoPendiente)}>
                    {formatCurrency(saldoPendiente)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Saldo Pendiente</div>
                </div>

                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg overflow-hidden flex flex-col justify-center">
                  <div className="text-lg sm:text-2xl font-bold text-purple-600 truncate w-full" title={formatCurrency(valorCuota)}>
                    {formatCurrency(valorCuota)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Valor Cuota</div>
                </div>
              </div>

              {/* Detalles básicos del préstamo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Tipo de crédito:</span>
                    <span className="font-semibold text-right break-words min-w-0">{getTipoCreditoText(prestamo.tipoCredito || 'EFECTIVO')}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Interés (%):</span>
                    <span className="font-semibold text-right break-words min-w-0">{prestamo.interes}%</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Interés total:</span>
                    <span className="font-semibold text-right break-words min-w-0">{formatCurrency(prestamo.interesTotal || interesAmount)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Tipo de pago:</span>
                    <span className="font-semibold text-right break-words min-w-0">{getTipoPagoText(prestamo.tipoPago)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Total cuotas:</span>
                    <span className="font-semibold text-right break-words min-w-0">{prestamo.cuotas}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Cuotas pagadas:</span>
                    <span className="font-semibold text-green-600 text-right break-words min-w-0">{Number(cuotasPagadas.toFixed(2))}</span>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Cuotas atrasadas:</span>
                    <span className={`font-semibold text-right break-words min-w-0 ${infoExtendida.cuotasAtrasadas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(infoExtendida.cuotasAtrasadas.toFixed(2))}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Cuotas pendientes:</span>
                    <span className="font-semibold text-orange-600 text-right break-words min-w-0">{infoExtendida.cuotasPendientes}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Días vencidos:</span>
                    <span className={`font-semibold text-right break-words min-w-0 ${infoExtendida.diasVencidos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {infoExtendida.diasVencidos}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Valor en atraso(s):</span>
                    <span className={`font-semibold text-right break-words min-w-0 ${infoExtendida.valorEnAtrasos > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(infoExtendida.valorEnAtrasos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Días transcurridos:</span>
                    <span className="font-semibold text-blue-600 text-right break-words min-w-0">{infoExtendida.diasTranscurridos}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 shrink-0">Días de gracia:</span>
                    <span className="font-semibold text-right break-words min-w-0">{infoExtendida.diasGracia}</span>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3 w-full">
                <h4 className="font-semibold text-gray-900 mb-2">Información Adicional</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start text-sm gap-2">
                      <span className="text-gray-600 shrink-0">Último pago:</span>
                      <span className="font-medium text-right break-words min-w-0">
                        {infoExtendida.ultimoPago
                          ? `${formatCurrency(infoExtendida.ultimoPago.monto)} - ${formatDateLocal(infoExtendida.ultimoPago.fecha)}`
                          : 'Sin pagos registrados'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-start text-sm gap-2 mt-2">
                      <span className="text-gray-600 shrink-0">Fecha próximo pago:</span>
                      <span className="font-medium text-right break-words min-w-0">
                        {infoExtendida.fechaProximoPago
                          ? formatDateLocal(infoExtendida.fechaProximoPago)
                          : 'Préstamo completado'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-start text-sm gap-2 mt-2">
                      <span className="text-gray-600 shrink-0">Mora crédito:</span>
                      <span className="font-medium text-right break-words min-w-0">{prestamo.moraCredito || 0}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start text-sm gap-2">
                      <span className="text-gray-600 shrink-0">Fecha inicio:</span>
                      <span className="font-medium text-right break-words min-w-0">{formatDate(String(prestamo.fechaInicio))}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm gap-2 mt-2">
                      <span className="text-gray-600 shrink-0">Fecha fin:</span>
                      <span className="font-medium text-right break-words min-w-0">{formatDate(String(prestamo.fechaFin))}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm gap-2 mt-2">
                      <span className="text-gray-600 shrink-0">Creado por:</span>
                      <span className="font-medium text-right break-words min-w-0">
                        {prestamo.usuario?.firstName && prestamo.usuario?.lastName
                          ? `${prestamo.usuario.firstName} ${prestamo.usuario.lastName}`
                          : "Usuario"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progreso */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progreso del préstamo</span>
                  <span>{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {prestamo.observaciones && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Observaciones:</h4>
                  <p className="text-gray-700">{prestamo.observaciones}</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-2">
                {prestamo.estado === "ACTIVO" && saldoPendiente > 0 && (
                  <Button
                    onClick={() => setShowPagoModal(true)}
                    className="flex-1 btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <DollarSign className="h-4 w-4 mr-1" />
                    Registrar Pago
                  </Button>
                )}

                <Button
                  onClick={() => setShowTransferenciaModal(true)}
                  variant="outline"
                  className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Transferencia
                </Button>

                <Button
                  onClick={handleEditarCliente}
                  variant="outline"
                  className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-400"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Cliente
                </Button>

                <Button
                  onClick={handleEditarBoleta}
                  variant="outline"
                  className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-400"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Boleta
                </Button>

                {prestamo.estado === "ACTIVO" && (
                  <>
                    <Button
                      onClick={() => handleRenovarCredito("REFINANCIAMIENTO")}
                      variant="outline"
                      className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-400"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refinanciar Crédito
                    </Button>

                    <Button
                      onClick={() => handleRenovarCredito("RENOVACION")}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renovar Crédito
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  className="flex-1 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
                  onClick={compartirPorWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Compartir
                </Button>

                {/* Botón de eliminar con diálogo de confirmación */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                      </div>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Esta acción <strong className="text-red-600">NO se puede deshacer</strong>.
                          Esto eliminará permanentemente:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li><strong>El préstamo completo</strong></li>
                          <li><strong>Todos los pagos asociados</strong> ({prestamo.pagos.length} pagos)</li>
                          <li><strong>Todo el historial</strong> relacionado</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-3">
                          Cliente: {prestamo.cliente.nombre} {prestamo.cliente.apellido}
                        </p>
                        <p className="font-medium text-red-700">
                          Monto: {formatCurrency(montoOriginal)}
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeletePrestamo}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sí, eliminar permanentemente
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Historial de pagos y transferencias */}
          <Card className="animate-fadeInScale" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Historial de Movimientos</span>
              </CardTitle>
              {prestamo.datosRefinanciamiento && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowRefinanciamientoHistory(!showRefinanciamientoHistory)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 h-8"
                >
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Historial Anterior</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {/* Tarjeta de Refinanciamiento Expansible */}
              {prestamo.datosRefinanciamiento && showRefinanciamientoHistory && (
                <div className="mb-4 animate-fadeInDown">
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center text-blue-800 font-medium mb-3 pb-2 border-b border-blue-100">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Detalles del Préstamo Anterior
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Monto Anterior</p>
                        <p className="font-semibold text-blue-900">{formatCurrency(prestamo.datosRefinanciamiento.montoOriginal || 0)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Total Pagado</p>
                        <p className="font-semibold text-blue-900">{formatCurrency(prestamo.datosRefinanciamiento.totalPagado || 0)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Saldo Absorbido</p>
                        <p className="font-bold text-blue-900">{formatCurrency(prestamo.datosRefinanciamiento.saldoPendiente || 0)}</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <Button 
                          variant="link" 
                          onClick={() => setShowSnapshotModal(true)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium p-0 h-auto justify-start"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Ver préstamo original
                        </Button>
                      </div>
                    </div>

                    {prestamo.prestamoAnteriorInfo && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t border-blue-100">
                        <div>
                          <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Fecha Inicio Original</p>
                          <p className="font-semibold text-blue-900">{new Date(prestamo.prestamoAnteriorInfo.fechaInicio).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Fecha Fin Teórica</p>
                          <p className="font-semibold text-blue-900">{new Date(prestamo.prestamoAnteriorInfo.fechaFin).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Cuotas Totales</p>
                          <p className="font-semibold text-blue-900">{prestamo.prestamoAnteriorInfo.cuotas}</p>
                        </div>
                        <div>
                          <p className="text-blue-600/80 text-[10px] sm:text-xs font-medium uppercase">Pagos Realizados</p>
                          <p className="font-semibold text-blue-900">{prestamo.prestamoAnteriorInfo.pagos.length}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(prestamo.pagos.length > 0 || transferencias.length > 0) ? (
                <div className="space-y-3">
                  {/* Mostrar pagos */}
                  {prestamo.pagos.map((pago: Pago, index: number) => (
                    <div
                      key={`pago-${pago.id}`}
                      className="flex items-start sm:items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-500 gap-2 overflow-hidden"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                          <div className="flex items-center space-x-1 shrink-0">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-600 truncate">
                              {formatCurrency(pago.monto)}
                            </span>
                          </div>
                          <Badge className="bg-green-100 text-green-800 text-[10px] h-4 px-1 shrink-0">
                            PAGO
                          </Badge>
                        </div>
                        <div className="text-[11px] sm:text-sm text-gray-500 mt-1 truncate block w-full">
                          {formatDateTime(String(pago.fecha))}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 truncate block w-full">
                          Por: {pago.usuario?.firstName && pago.usuario?.lastName
                            ? `${pago.usuario.firstName} ${pago.usuario.lastName}`
                            : "Usuario"
                          }
                        </div>
                        {pago.observaciones && (
                          <div className="text-[11px] text-gray-600 mt-1 pb-1 border-b border-green-100 sm:border-0 sm:pb-0 break-words w-full">
                            {pago.observaciones}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 self-start sm:self-center">
                        {/* Botón ver boleta */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 shrink-0"
                          title="Ver Boleta"
                          onClick={() => handleVerBoletaPago(pago)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>

                        {/* Botón eliminar pago */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 shrink-0"
                          title="Eliminar Pago"
                          onClick={() => handleDeletePago(pago.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Mostrar transferencias */}
                  {transferencias.map((transferencia: Transferencia, index: number) => (
                    <div
                      key={`transferencia-${transferencia.id}`}
                      className="flex items-start sm:items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 gap-2 overflow-hidden"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                          <div className="flex items-center space-x-1 shrink-0">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-600 truncate">
                              {formatCurrency(transferencia.monto)}
                            </span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px] h-4 px-1 shrink-0">
                            TRANSFERENCIA
                          </Badge>
                        </div>
                        {transferencia.banco && (
                          <div className="text-[11px] sm:text-sm text-blue-600 mt-1 truncate">
                            {transferencia.banco}
                          </div>
                        )}
                        {transferencia.referencia && (
                          <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                            Ref: {transferencia.referencia}
                          </div>
                        )}
                        <div className="text-[11px] sm:text-sm text-gray-500 mt-0.5 truncate block w-full">
                          {formatDateTime(String(transferencia.fecha))}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 truncate block w-full">
                          Por: {transferencia.usuario?.firstName && transferencia.usuario?.lastName
                            ? `${transferencia.usuario.firstName} ${transferencia.usuario.lastName}`
                            : "Usuario"
                          }
                        </div>
                        {transferencia.observaciones && (
                          <div className="text-[11px] text-gray-600 mt-1 pb-1 border-b border-blue-100 sm:border-0 sm:pb-0 break-words w-full">
                            {transferencia.observaciones}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 self-start sm:self-center">
                        <div className="flex items-center space-x-1">
                          {transferencia.fotoComprobante && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedImage({
                                  url: transferencia.fotoComprobante,
                                  title: "Comprobante de Transferencia",
                                  subtitle: `Monto: ${formatCurrency(transferencia.monto)} - Ref: ${transferencia.referencia || 'S/N'}`
                                })
                                setShowImageModal(true)
                              }}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 shrink-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Botón ver boleta para transferencia (busca el pago asociado) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                            title="Ver Boleta"
                            onClick={() => handleVerBoletaTransferencia(transferencia)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {/* Botón eliminar transferencia */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 shrink-0"
                            title="Eliminar Transferencia"
                            onClick={() => handleDeleteTransferencia(transferencia.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No hay movimientos registrados aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de visualización de boleta */}
      <BoletaViewerModal
        isOpen={showBoletaModal}
        onClose={() => setShowBoletaModal(false)}
        data={selectedBoletaData}
      />

      {/* Modal de pago rápido */}
      <PagoRapidoModal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        prestamo={prestamoFormatted as Parameters<typeof PagoRapidoModal>[0]['prestamo']}
        onSuccess={onPagoSuccess}
      />

      {/* Modal de cámara */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        clienteId={prestamo.cliente.id}
        clienteNombre={`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}
        onPhotoSaved={onPhotoSaved}
      />

      {/* Modal de transferencia */}
      <TransferenciaModal
        isOpen={showTransferenciaModal}
        onClose={() => setShowTransferenciaModal(false)}
        prestamoId={prestamo.id}
        clienteNombre={`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}
        onTransferenciaSaved={onTransferenciaSaved}
      />

      {/* Modal de refinanciamiento / renovación de crédito */}
      <Dialog open={showRenovacionModal} onOpenChange={handleCancelRenovacion}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={`flex items-center space-x-2 ${tipoOperacion === 'RENOVACION' ? 'text-blue-600' : 'text-orange-600'}`}>
              <RefreshCw className="h-5 w-5" />
              <span>{tipoOperacion === 'RENOVACION' ? 'Renovar Crédito' : 'Refinanciar Crédito'}</span>
            </DialogTitle>
            <DialogDescription>
              {tipoOperacion === 'RENOVACION' ? 'Renueva' : 'Refinancia'} el crédito actual. El saldo pendiente se descontará automáticamente del nuevo monto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRenovacion} className="space-y-4">
            {/* Información actual del crédito */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2">Crédito Actual:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Monto:</span>
                  <div className="font-semibold">{formatCurrency(montoOriginal)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Saldo Pendiente:</span>
                  <div className="font-semibold text-red-600">{formatCurrency(saldoPendiente)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Interés:</span>
                  <div className="font-semibold">{prestamo.interes}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <div className="font-semibold">{prestamo.estado}</div>
                </div>
              </div>
            </div>

            {/* Formulario de renovación */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="montoRenovacion">Nuevo Monto *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="montoRenovacion"
                    type="number"
                    step="0.01"
                    value={montoRenovacion}
                    onChange={(e) => setMontoRenovacion(e.target.value)}
                    className="pl-10"
                    required
                    disabled={renovando}
                    min={saldoPendiente}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Monto mínimo: {formatCurrency(saldoPendiente)} (saldo pendiente)
                </div>
              </div>

              <div>
                <Label htmlFor="interesRenovacion">Interés (%) *</Label>
                <div className="relative mt-1">
                  <Calculator className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="interesRenovacion"
                    type="number"
                    step="0.01"
                    value={interesRenovacion}
                    onChange={(e) => setInteresRenovacion(e.target.value)}
                    className="pl-10 bg-white"
                    required
                    disabled={renovando}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoPagoRenovacion">Tipo de pago *</Label>
                  <Select value={tipoPagoRenovacion} onValueChange={setTipoPagoRenovacion} disabled={renovando}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIARIO">Diario</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="LUNES_A_VIERNES">Lunes a Viernes</SelectItem>
                      <SelectItem value="LUNES_A_SABADO">Lunes a Sábado</SelectItem>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="CATORCENAL">Catorcenal</SelectItem>
                      <SelectItem value="FIN_DE_MES">Fin de Mes</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                      <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                      <SelectItem value="CUATRIMESTRAL">Cuatrimestral</SelectItem>
                      <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                      <SelectItem value="ANUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cuotasRenovacion">Número de cuotas *</Label>
                  <Input
                    id="cuotasRenovacion"
                    type="number"
                    value={cuotasRenovacion}
                    onChange={(e) => setCuotasRenovacion(e.target.value)}
                    className="mt-1"
                    required
                    disabled={renovando}
                    min="1"
                  />
                </div>
              </div>

              {/* Microseguros para Renovación */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
                <div className="flex items-center space-x-2 text-blue-900 font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <Label>Microseguro</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tipoMicroseguroRenovacion" className="text-xs text-blue-800">Tipo</Label>
                    <Select
                      value={tipoMicroseguroRenovacion}
                      onValueChange={(value: any) => setTipoMicroseguroRenovacion(value)}
                      disabled={renovando}
                    >
                      <SelectTrigger id="tipoMicroseguroRenovacion" className="mt-1 bg-white border-blue-300">
                        <SelectValue placeholder="Tipo de seguro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">Ninguno</SelectItem>
                        <SelectItem value="MONTO_FIJO">Monto Fijo</SelectItem>
                        <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {tipoMicroseguroRenovacion !== 'NINGUNO' && (
                    <div className="animate-fadeInScale">
                      <Label htmlFor="valorMicroseguroRenovacion" className="text-xs text-blue-800">
                        {tipoMicroseguroRenovacion === 'MONTO_FIJO' ? 'Valor ($)' : 'Porcentaje (%)'}
                      </Label>
                      <Input
                        id="valorMicroseguroRenovacion"
                        type="number"
                        step="0.01"
                        value={valorMicroseguroRenovacion}
                        onChange={(e) => setValorMicroseguroRenovacion(e.target.value)}
                        className="mt-1 bg-white border-blue-300"
                        disabled={renovando}
                        placeholder={tipoMicroseguroRenovacion === 'MONTO_FIJO' ? "0.00" : "0"}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="fechaInicioRenovacion">Fecha de inicio *</Label>
                <Input
                  id="fechaInicioRenovacion"
                  type="date"
                  value={fechaInicioRenovacion}
                  onChange={(e) => setFechaInicioRenovacion(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof (e.target as HTMLInputElement).showPicker === 'function') {
                        (e.target as HTMLInputElement).showPicker()
                      }
                    } catch (error) {
                      console.log('showPicker not supported', error)
                    }
                  }}
                  className="mt-1 cursor-pointer"
                  required
                  disabled={renovando}
                />
              </div>

              <div>
                <Label htmlFor="observacionesRenovacion">Observaciones</Label>
                <Textarea
                  id="observacionesRenovacion"
                  value={observacionesRenovacion}
                  onChange={(e) => setObservacionesRenovacion(e.target.value)}
                  placeholder="Observaciones opcionales sobre el refinanciamiento..."
                  className="mt-1"
                  disabled={renovando}
                />
              </div>

              {/* Resumen de cálculos */}
              {montoRenovacion && interesRenovacion && cuotasRenovacion && (
                <div className={`${tipoOperacion === 'RENOVACION' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} rounded-lg p-4 border`}>
                  <h4 className={`font-semibold ${tipoOperacion === 'RENOVACION' ? 'text-blue-900' : 'text-orange-900'} mb-2`}>
                    Resumen de {tipoOperacion === 'RENOVACION' ? 'Renovación' : 'Refinanciamiento'}:
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-700">Nuevo monto:</span>
                      <span className="font-semibold">{formatCurrency(parseFloat(montoRenovacion) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700">Descuento (saldo pendiente):</span>
                      <span className="font-semibold text-red-600">- {formatCurrency(saldoPendiente)}</span>
                    </div>
                    <div className="flex justify-between border-t border-orange-200 pt-2">
                      <span className="text-orange-700 font-medium">Monto efectivo:</span>
                      <span className="font-bold text-green-600">{formatCurrency(calcularRenovacion().montoEfectivo)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700">Interés ({interesRenovacion}%):</span>
                      <span className="font-semibold">{formatCurrency(calcularRenovacion().montoConInteres - (parseFloat(montoRenovacion) || 0))}</span>
                    </div>
                    <div className="flex justify-between border-t border-orange-200 pt-2">
                      <span className="text-orange-700 font-medium">Total a pagar:</span>
                      <span className="font-bold text-lg">{formatCurrency(calcularRenovacion().montoConInteres)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-medium">Valor por cuota:</span>
                      <span className="font-bold text-lg text-blue-600">{formatCurrency(calcularRenovacion().valorCuotaNueva)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelRenovacion}
                disabled={renovando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={renovando || !montoRenovacion || !interesRenovacion || !cuotasRenovacion}
                className={tipoOperacion === 'RENOVACION' ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}
              >
                {renovando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {tipoOperacion === 'RENOVACION' ? 'Renovando...' : 'Refinanciando...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {tipoOperacion === 'RENOVACION' ? 'Renovar Crédito' : 'Refinanciar Crédito'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de cliente */}
      <Dialog open={showEditarModal} onOpenChange={handleCancelEdicion}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-purple-600">
              <User className="h-5 w-5" />
              <span>Editar Información de Cliente</span>
            </DialogTitle>
            <DialogDescription>
              Modifica los datos personales y de contacto del cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdicion} className="space-y-4">
            {/* Información actual del cliente */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2">Información Actual:</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Nombre completo:</span>
                  <div className="font-semibold">{prestamo.cliente.nombre} {prestamo.cliente.apellido}</div>
                </div>
                <div>
                  <span className="text-gray-600">Documento:</span>
                  <div className="font-semibold">{prestamo.cliente.documento}</div>
                </div>
                <div>
                  <span className="text-gray-600">Teléfono:</span>
                  <div className="font-semibold">{prestamo.cliente.telefono || 'No registrado'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Dirección Cliente:</span>
                  <div className="font-semibold">{prestamo.cliente.direccionCliente || 'No registrada'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Dirección Cobro:</span>
                  <div className="font-semibold">{prestamo.cliente.direccionCobro || 'No registrada'}</div>
                </div>
              </div>
            </div>

            {/* Formulario de edición del cliente */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombreEditar">Nombre *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="nombreEditar"
                      type="text"
                      value={nombreEditar}
                      onChange={(e) => setNombreEditar(e.target.value)}
                      className="pl-10"
                      required
                      disabled={editando}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="apellidoEditar">Apellido *</Label>
                  <Input
                    id="apellidoEditar"
                    type="text"
                    value={apellidoEditar}
                    onChange={(e) => setApellidoEditar(e.target.value)}
                    className="mt-1"
                    required
                    disabled={editando}
                    placeholder="Apellido del cliente"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="documentoEditar">Documento *</Label>
                <div className="relative mt-1">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="documentoEditar"
                    type="text"
                    value={documentoEditar}
                    onChange={(e) => setDocumentoEditar(e.target.value)}
                    className="pl-10"
                    required
                    disabled={editando}
                    placeholder="Número de documento"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="telefonoEditar">Teléfono</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="telefonoEditar"
                    type="tel"
                    value={telefonoEditar}
                    onChange={(e) => setTelefonoEditar(e.target.value)}
                    className="pl-10"
                    disabled={editando}
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="direccionClienteEditar">Dirección del Cliente</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="direccionClienteEditar"
                    type="text"
                    value={direccionClienteEditar}
                    onChange={(e) => setDireccionClienteEditar(e.target.value)}
                    className="pl-10"
                    disabled={editando}
                    placeholder="Dirección de residencia"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="direccionCobroEditar">Dirección de Cobro / Google Maps</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="direccionCobroEditar"
                    type="text"
                    value={direccionCobroEditar}
                    onChange={(e) => setDireccionCobroEditar(e.target.value)}
                    className="pl-10 text-xs sm:text-sm"
                    disabled={editando}
                    placeholder="Pega link de Google Maps o escribe la dirección"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Puedes pegar directamente el enlace de Google Maps compartido.</p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdicion}
                disabled={editando}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editando || !nombreEditar.trim() || !apellidoEditar.trim() || !documentoEditar.trim()}
                className="bg-purple-600 hover:bg-purple-700 flex-1"
              >
                {editando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Actualizar Cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de boleta (préstamo) */}
      <Dialog open={showEditarBoletaModal} onOpenChange={handleCancelEditarBoleta}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-teal-600">
              <ShieldCheck className="h-5 w-5" />
              <span>Editar Boleta de Préstamo</span>
            </DialogTitle>
            <DialogDescription>
              Modifica los valores del préstamo por si hay algún error de registro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEditarBoleta} className="space-y-4">
            <div className="space-y-4">
              {/* Monto e Interés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <Label htmlFor="montoEditar" className="text-purple-900 font-semibold">Monto ($) *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-purple-600 pointer-events-none" />
                    <Input
                      id="montoEditar"
                      type="number"
                      step="0.01"
                      value={montoEditar}
                      onChange={(e) => setMontoEditar(e.target.value)}
                      className="pl-10 border-purple-300 focus:ring-purple-500 font-bold bg-white"
                      disabled={editando}
                      required
                    />
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <Label htmlFor="interesEditar" className="text-purple-900 font-semibold">Interés (%) *</Label>
                  <div className="relative mt-1">
                    <Calculator className="absolute left-3 top-3 h-4 w-4 text-purple-600 pointer-events-none" />
                    <Input
                      id="interesEditar"
                      type="number"
                      step="0.01"
                      value={interesEditar}
                      onChange={(e) => setInteresEditar(e.target.value)}
                      className="pl-10 border-purple-300 focus:ring-purple-500 font-bold bg-white"
                      disabled={editando}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Frecuencia de pago y Cuotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoPagoEditar">Frecuencia *</Label>
                  <Select value={tipoPagoEditar} onValueChange={setTipoPagoEditar} disabled={editando}>
                    <SelectTrigger id="tipoPagoEditar" className="mt-1">
                      <SelectValue placeholder="Frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIARIO">Diario</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="LUNES_A_VIERNES">Lunes a Viernes</SelectItem>
                      <SelectItem value="LUNES_A_SABADO">Lunes a Sábado</SelectItem>
                      <SelectItem value="QUINCENAL">Quincenal</SelectItem>
                      <SelectItem value="CATORCENAL">Catorcenal</SelectItem>
                      <SelectItem value="FIN_DE_MES">Fin de Mes</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                      <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                      <SelectItem value="CUATRIMESTRAL">Cuatrimestral</SelectItem>
                      <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                      <SelectItem value="ANUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cuotasEditar">Cuotas *</Label>
                  <Input
                    id="cuotasEditar"
                    type="number"
                    value={cuotasEditar}
                    onChange={(e) => setCuotasEditar(e.target.value)}
                    className="mt-1"
                    disabled={editando}
                    required
                  />
                </div>
              </div>

              {/* Fechas del préstamo */}
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                <div>
                  <Label htmlFor="fechaInicioEditar" className="text-orange-900 font-semibold">Fecha de Inicio del Préstamo</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-orange-600 pointer-events-none" />
                    <Input
                      id="fechaInicioEditar"
                      type="date"
                      value={fechaInicioEditar}
                      onChange={(e) => setFechaInicioEditar(e.target.value)}
                      className="pl-10 border-orange-300 focus:ring-orange-500 font-bold bg-white"
                      disabled={editando}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-orange-200">
                  <Label htmlFor="fechaFinEditar" className="text-orange-900 font-semibold">Fecha de Fin (Sobrescribir manualmente)</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-orange-600 pointer-events-none" />
                    <Input
                      id="fechaFinEditar"
                      type="date"
                      value={fechaFinEditar}
                      onChange={(e) => setFechaFinEditar(e.target.value)}
                      className="pl-10 border-orange-300 focus:ring-orange-500 bg-white"
                      disabled={editando}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-orange-200">
                  <div>
                    <Label htmlFor="diasTranscurridosEditar" className="text-xs text-orange-800">Días Trans. (Manual)</Label>
                    <Input
                      id="diasTranscurridosEditar"
                      type="number"
                      value={diasTranscurridosEditar}
                      onChange={(e) => setDiasTranscurridosEditar(e.target.value)}
                      className="mt-1 bg-white border-orange-300"
                      disabled={editando}
                      placeholder="Ej. 12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fechaProximoPagoEditar" className="text-xs text-orange-800">Próx. Pago (Manual)</Label>
                    <Input
                      id="fechaProximoPagoEditar"
                      type="date"
                      value={fechaProximoPagoEditar}
                      onChange={(e) => setFechaProximoPagoEditar(e.target.value)}
                      className="mt-1 bg-white border-orange-300 px-2 text-xs"
                      disabled={editando}
                    />
                  </div>
                </div>
              </div>

              {/* Microseguros */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-3">
                <div className="flex items-center space-x-2 text-blue-900 font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <Label>Microseguro</Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tipoMicroseguroEditar" className="text-xs text-blue-800">Tipo</Label>
                    <Select
                      value={tipoMicroseguroEditar}
                      onValueChange={(value: any) => setTipoMicroseguroEditar(value)}
                      disabled={editando}
                    >
                      <SelectTrigger id="tipoMicroseguroEditar" className="mt-1 bg-white border-blue-300">
                        <SelectValue placeholder="Tipo de seguro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">Ninguno</SelectItem>
                        <SelectItem value="MONTO_FIJO">Monto Fijo</SelectItem>
                        <SelectItem value="PORCENTAJE">Porcentaje</SelectItem>
                        <SelectItem value="DEVOLUCION">Devolución</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {tipoMicroseguroEditar !== 'NINGUNO' && (
                    <div className="animate-fadeInScale">
                      <Label htmlFor="valorMicroseguroEditar" className="text-xs text-blue-800">
                        {tipoMicroseguroEditar === 'PORCENTAJE' ? 'Porcentaje (%)' : tipoMicroseguroEditar === 'DEVOLUCION' ? 'Valor a devolver ($)' : 'Valor ($)'}
                      </Label>
                      <Input
                        id="valorMicroseguroEditar"
                        type="number"
                        step="0.01"
                        value={valorMicroseguroEditar}
                        onChange={(e) => setValorMicroseguroEditar(e.target.value)}
                        className="mt-1 bg-white border-blue-300"
                        disabled={editando}
                        placeholder={tipoMicroseguroEditar === 'MONTO_FIJO' || tipoMicroseguroEditar === 'DEVOLUCION' ? "0.00" : "0"}
                      />
                    </div>
                  )}
                </div>

                {/* Resumen de totales editados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-blue-100 p-2 rounded border border-blue-200 shadow-sm">
                    <p className="text-[10px] text-blue-700 font-bold uppercase">Nuevo Total</p>
                    <p className="text-sm font-bold text-blue-900">{formatCurrency(montoTotalEditar)}</p>
                  </div>
                  <div className="bg-emerald-100 p-2 rounded border border-emerald-200 shadow-sm">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Nueva Cuota</p>
                    <p className="text-sm font-bold text-emerald-900">{formatCurrency(cuotaEditar)}</p>
                  </div>
                </div>
              </div>
              
              {/* Ajustes Manuales de Cobro / Morosidad */}
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-3">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <Label>Ajustes de Cobro (Morosidad y Crédito)</Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tipoCreditoEditar" className="text-xs text-amber-800">Tipo de Crédito</Label>
                    <Select
                      value={tipoCreditoEditar}
                      onValueChange={setTipoCreditoEditar}
                      disabled={editando}
                    >
                      <SelectTrigger id="tipoCreditoEditar" className="mt-1 bg-white border-amber-300">
                        <SelectValue placeholder="Tipo de Crédito" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="diasGraciaEditar" className="text-xs text-amber-800">Días de Gracia</Label>
                    <Input
                      id="diasGraciaEditar"
                      type="number"
                      value={diasGraciaEditar}
                      onChange={(e) => setDiasGraciaEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300"
                      disabled={editando}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-200">
                  <div>
                    <Label htmlFor="cuotasPagadasManualEditar" className="text-[10px] text-amber-800">Cuotas Pagadas</Label>
                    <Input
                      id="cuotasPagadasManualEditar"
                      type="number"
                      step="0.01"
                      value={cuotasPagadasManualEditar}
                      onChange={(e) => setCuotasPagadasManualEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300 h-8 text-xs font-medium"
                      disabled={editando}
                      placeholder={infoExtendida.cuotasPagadasAuto.toFixed(2)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cuotasAtrasadasManualEditar" className="text-[10px] text-amber-800">Cuotas Atrasadas</Label>
                    <Input
                      id="cuotasAtrasadasManualEditar"
                      type="number"
                      step="0.01"
                      value={cuotasAtrasadasManualEditar}
                      onChange={(e) => setCuotasAtrasadasManualEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300 h-8 text-xs font-medium"
                      disabled={editando}
                      placeholder={infoExtendida.cuotasAtrasadasAuto.toFixed(2)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cuotasPendientesManualEditar" className="text-[10px] text-amber-800">Cuotas Pendientes</Label>
                    <Input
                      id="cuotasPendientesManualEditar"
                      type="number"
                      step="0.01"
                      value={cuotasPendientesManualEditar}
                      onChange={(e) => setCuotasPendientesManualEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300 h-8 text-xs font-medium"
                      disabled={editando}
                      placeholder={infoExtendida.cuotasPendientesAuto.toFixed(2)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label htmlFor="diasVencidosManualEditar" className="text-xs text-amber-800">Días Vencidos (Manual)</Label>
                    <Input
                      id="diasVencidosManualEditar"
                      type="number"
                      value={diasVencidosManualEditar}
                      onChange={(e) => setDiasVencidosManualEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300 h-8 text-xs font-medium"
                      disabled={editando}
                      placeholder={infoExtendida.diasVencidosAuto.toString()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valorEnAtrasoManualEditar" className="text-xs text-amber-800">Valor en Atraso ($)</Label>
                    <Input
                      id="valorEnAtrasoManualEditar"
                      type="number"
                      step="0.01"
                      value={valorEnAtrasoManualEditar}
                      onChange={(e) => setValorEnAtrasoManualEditar(e.target.value)}
                      className="mt-1 bg-white border-amber-300 h-8 text-xs font-medium"
                      disabled={editando}
                      placeholder={infoExtendida.valorEnAtrasoAuto.toFixed(2)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEditarBoleta}
                disabled={editando}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editando || !montoEditar || !interesEditar || !cuotasEditar || !tipoPagoEditar}
                className="bg-teal-600 hover:bg-teal-700 flex-1 text-white"
              >
                {editando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Actualizar Boleta
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Snapshot de Refinanciamiento/Renovacion */}
      <Dialog open={showSnapshotModal} onOpenChange={setShowSnapshotModal}>
        <DialogContent className="sm:max-w-md bg-slate-50">
          <DialogHeader>
            <DialogTitle className="flex items-center text-slate-800">
              <Camera className="h-5 w-5 mr-2 text-blue-600" />
              Fotografía del Préstamo Anterior
            </DialogTitle>
            <DialogDescription>
              Estado del préstamo en el momento exacto en que fue {prestamo.datosRefinanciamiento?.tipoOperacion === 'RENOVACION' ? 'renovado' : 'refinanciado'}.
            </DialogDescription>
          </DialogHeader>
          
          {prestamo.datosRefinanciamiento && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200">
                <span className="text-sm text-slate-500 font-medium">ID Original</span>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                  {prestamo.renovadoDeId}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Monto Original</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(prestamo.datosRefinanciamiento.montoOriginal || 0)}</p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Pagado</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(prestamo.datosRefinanciamiento.totalPagado || 0)}</p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 col-span-2">
                  <p className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold mb-1">
                    Saldo Absorbido al {prestamo.datosRefinanciamiento?.tipoOperacion === 'RENOVACION' ? 'Renovar' : 'Refinanciar'}
                  </p>
                  <p className="text-xl font-black text-blue-800">{formatCurrency(prestamo.datosRefinanciamiento.saldoPendiente || 0)}</p>
                </div>
              </div>
              
              {prestamo.prestamoAnteriorInfo && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Fecha Inicio</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(prestamo.prestamoAnteriorInfo.fechaInicio).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Fecha Fin</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(prestamo.prestamoAnteriorInfo.fechaFin).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Cuotas Originales</p>
                    <p className="text-sm font-bold text-slate-800">{prestamo.prestamoAnteriorInfo.cuotas}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Pagos Registrados</p>
                    <p className="text-sm font-bold text-slate-800">{prestamo.prestamoAnteriorInfo.pagos.length}</p>
                  </div>
                </div>
              )}
              
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Refinanciado el {new Date(prestamo.datosRefinanciamiento.fechaRefinanciamiento).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowSnapshotModal(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal de imagen */}
      {selectedImage && (
        <ImageViewerModal
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false)
            setSelectedImage(null)
          }}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
          subtitle={selectedImage.subtitle}
        />
      )}
    </div>
  )
}
