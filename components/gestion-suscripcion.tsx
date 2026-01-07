
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertCircle, CheckCircle, Calendar, DollarSign, Building, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Suscripcion {
  id: string;
  nombreEmpresa: string;
  emailContacto: string;
  telefonoContacto?: string;
  rucEmpresa?: string;
  direccion?: string;
  plan: 'MENSUAL' | 'ANUAL';
  estado: string;
  fechaInicio: string;
  fechaVencimiento: string;
  fechaActivacion?: string;
}

interface Pago {
  id: string;
  monto: string;
  fechaPago: string;
  metodoPago: string;
  banco?: string;
  numeroReferencia?: string;
  comprobanteUrl?: string;
  estado: string;
  periodoInicio: string;
  periodoFin: string;
  observaciones?: string;
}

interface SubscriptionStatus {
  isValid: boolean;
  isTrialPeriod: boolean;
  daysRemaining: number;
  suscripcion: Suscripcion | null;
}

export default function GestionSuscripcion() {
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Formulario de nueva suscripción
  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    emailContacto: '',
    telefonoContacto: '',
    rucEmpresa: '',
    direccion: ''
  });

  // Formulario de pago
  const [paymentData, setPaymentData] = useState({
    monto: '50',
    metodoPago: 'TRANSFERENCIA_BANCARIA',
    banco: '',
    numeroReferencia: '',
    observaciones: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar estado de suscripción
      const resStatus = await fetch('/api/admin/suscripcion');
      const statusData = await resStatus.json();
      setStatus(statusData);

      // Cargar historial de pagos
      const resPagos = await fetch('/api/admin/suscripcion/pagos');
      const pagosData = await resPagos.json();
      setPagos(pagosData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin/suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear suscripción');
      }

      toast.success('Suscripción creada exitosamente. Período de prueba: 10 días');
      setShowCreateModal(false);
      setFormData({
        nombreEmpresa: '',
        emailContacto: '',
        telefonoContacto: '',
        rucEmpresa: '',
        direccion: ''
      });
      loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!status?.suscripcion) {
      toast.error('No hay suscripción activa');
      return;
    }

    try {
      const res = await fetch('/api/admin/suscripcion/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suscripcionId: status.suscripcion.id,
          ...paymentData,
          monto: parseFloat(paymentData.monto)
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al registrar pago');
      }

      toast.success('Pago registrado. Pendiente de verificación');
      setShowPaymentModal(false);
      setPaymentData({
        monto: '50',
        metodoPago: 'TRANSFERENCIA_BANCARIA',
        banco: '',
        numeroReferencia: '',
        observaciones: ''
      });
      loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const handleVerifyPayment = async (id: string, estado: 'CONFIRMADO' | 'RECHAZADO') => {
    try {
      const res = await fetch(`/api/admin/suscripcion/pagos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });

      if (!res.ok) {
        throw new Error('Error al verificar pago');
      }

      toast.success(
        estado === 'CONFIRMADO' 
          ? 'Pago confirmado. Suscripción activada' 
          : 'Pago rechazado'
      );
      loadData();
    } catch (error) {
      toast.error('Error al verificar pago');
    }
  };

  const getEstadoBadge = (estado: string) => {
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | null | undefined;
    const variants: Record<string, { variant: BadgeVariant; text: string }> = {
      PRUEBA: { variant: 'default', text: 'Período de Prueba' },
      ACTIVA: { variant: 'default', text: 'Activa' },
      VENCIDA: { variant: 'destructive', text: 'Vencida' },
      SUSPENDIDA: { variant: 'secondary', text: 'Suspendida' },
      CANCELADA: { variant: 'secondary', text: 'Cancelada' }
    };

    const config = variants[estado] || { variant: 'default' as BadgeVariant, text: estado };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getEstadoPagoBadge = (estado: string) => {
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | null | undefined;
    const variants: Record<string, { variant: BadgeVariant; text: string }> = {
      PENDIENTE: { variant: 'secondary', text: 'Pendiente' },
      CONFIRMADO: { variant: 'default', text: 'Confirmado' },
      RECHAZADO: { variant: 'destructive', text: 'Rechazado' }
    };

    const config = variants[estado] || { variant: 'default' as BadgeVariant, text: estado };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestión de Suscripción</h2>
        
        {!status?.suscripcion ? (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Building className="mr-2 h-4 w-4" />
                Crear Suscripción
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Suscripción</DialogTitle>
                <DialogDescription>
                  Inicia un período de prueba de 10 días
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubscription} className="space-y-4">
                <div>
                  <Label htmlFor="nombreEmpresa">Nombre de la Empresa *</Label>
                  <Input
                    id="nombreEmpresa"
                    value={formData.nombreEmpresa}
                    onChange={(e) => setFormData({ ...formData, nombreEmpresa: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emailContacto">Email de Contacto *</Label>
                  <Input
                    id="emailContacto"
                    type="email"
                    value={formData.emailContacto}
                    onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefonoContacto">Teléfono</Label>
                  <Input
                    id="telefonoContacto"
                    value={formData.telefonoContacto}
                    onChange={(e) => setFormData({ ...formData, telefonoContacto: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rucEmpresa">RUC</Label>
                  <Input
                    id="rucEmpresa"
                    value={formData.rucEmpresa}
                    onChange={(e) => setFormData({ ...formData, rucEmpresa: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Crear</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogTrigger asChild>
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  Plan {status.suscripcion.plan}: ${status.suscripcion.plan === 'MENSUAL' ? '50' : '500'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div>
                  <Label htmlFor="monto">Monto (USD) *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={paymentData.monto}
                    onChange={(e) => setPaymentData({ ...paymentData, monto: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="metodoPago">Método de Pago *</Label>
                  <Select
                    value={paymentData.metodoPago}
                    onValueChange={(value) => setPaymentData({ ...paymentData, metodoPago: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRANSFERENCIA_BANCARIA">Transferencia Bancaria</SelectItem>
                      <SelectItem value="DEPOSITO">Depósito</SelectItem>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banco">Banco *</Label>
                  <Select
                    value={paymentData.banco}
                    onValueChange={(value) => setPaymentData({ ...paymentData, banco: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banco Pichincha">Banco Pichincha</SelectItem>
                      <SelectItem value="Banco Guayaquil">Banco Guayaquil</SelectItem>
                      <SelectItem value="Banco del Pacífico">Banco del Pacífico</SelectItem>
                      <SelectItem value="Produbanco">Produbanco</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numeroReferencia">Número de Referencia *</Label>
                  <Input
                    id="numeroReferencia"
                    value={paymentData.numeroReferencia}
                    onChange={(e) => setPaymentData({ ...paymentData, numeroReferencia: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={paymentData.observaciones}
                    onChange={(e) => setPaymentData({ ...paymentData, observaciones: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Registrar</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Estado de Suscripción */}
      {status?.suscripcion && (
        <Card>
          <CardHeader>
            <CardTitle>Estado de Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="text-lg font-semibold">{status.suscripcion.nombreEmpresa}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">{status.suscripcion.plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="mt-1">{getEstadoBadge(status.suscripcion.estado)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Días Restantes</p>
                <p className="text-lg font-semibold flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {status.daysRemaining} días
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                <p className="text-lg font-semibold">
                  {format(new Date(status.suscripcion.fechaVencimiento), 'PPP', { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{status.suscripcion.emailContacto}</p>
              </div>
              {status.suscripcion.telefonoContacto && (
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{status.suscripcion.telefonoContacto}</p>
                </div>
              )}
              {status.suscripcion.rucEmpresa && (
                <div>
                  <p className="text-sm text-muted-foreground">RUC</p>
                  <p className="text-sm">{status.suscripcion.rucEmpresa}</p>
                </div>
              )}
            </div>
            
            {status.isTrialPeriod && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Período de Prueba</p>
                    <p className="text-sm text-blue-700">
                      Tienes {status.daysRemaining} días restantes de prueba gratuita. 
                      Registra un pago para activar la suscripción.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de Pagos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            Registro de todos los pagos realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay pagos registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        {format(new Date(pago.fechaPago), 'PP', { locale: es })}
                      </TableCell>
                      <TableCell>${parseFloat(pago.monto).toFixed(2)}</TableCell>
                      <TableCell>{pago.metodoPago.replace('_', ' ')}</TableCell>
                      <TableCell>{pago.banco || '-'}</TableCell>
                      <TableCell>{pago.numeroReferencia || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(pago.periodoInicio), 'PP', { locale: es })}
                        {' - '}
                        {format(new Date(pago.periodoFin), 'PP', { locale: es })}
                      </TableCell>
                      <TableCell>{getEstadoPagoBadge(pago.estado)}</TableCell>
                      <TableCell>
                        {pago.estado === 'PENDIENTE' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleVerifyPayment(pago.id, 'CONFIRMADO')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerifyPayment(pago.id, 'RECHAZADO')}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Precios */}
      <Card>
        <CardHeader>
          <CardTitle>Planes Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-md">
              <h4 className="font-semibold text-lg mb-2">Plan Mensual</h4>
              <p className="text-3xl font-bold mb-2">$50<span className="text-sm text-muted-foreground">/mes</span></p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Acceso completo al sistema</li>
                <li>✓ Usuarios ilimitados</li>
                <li>✓ Soporte técnico</li>
              </ul>
            </div>
            <div className="p-4 border rounded-md">
              <h4 className="font-semibold text-lg mb-2">Plan Anual</h4>
              <p className="text-3xl font-bold mb-2">$500<span className="text-sm text-muted-foreground">/año</span></p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Acceso completo al sistema</li>
                <li>✓ Usuarios ilimitados</li>
                <li>✓ Soporte técnico prioritario</li>
                <li>✓ Ahorra $100 al año</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
