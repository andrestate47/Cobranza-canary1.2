'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, DollarSign, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllCurrencies, type Moneda } from '@/lib/currency';

export default function ConfiguracionClient() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [monedaActual, setMonedaActual] = useState<Moneda>('USD');
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<Moneda>('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencies = getAllCurrencies();

  // Verificar si el usuario es administrador
  const isAdmin = session?.user?.role === 'ADMINISTRADOR';

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const config = await response.json();
        setMonedaActual(config.moneda);
        setMonedaSeleccionada(config.moneda);
        setLogoUrl(config.logoUrl);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    if (!isAdmin) {
      toast.error('Solo los administradores pueden cambiar la configuración');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moneda: monedaSeleccionada }),
      });

      if (response.ok) {
        setMonedaActual(monedaSeleccionada);
        toast.success('Configuración guardada correctamente');
        // Recargar la página para aplicar los cambios
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      toast.error('Solo los administradores pueden cambiar el logo');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/configuracion/logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoUrl(data.logoUrl);
        toast.success('Logo actualizado correctamente');
      } else {
        const errorData = await response.json();
        toast.error(errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Error al subir el logo'));
      }
    } catch (error) {
      console.error('Error al subir logo:', error);
      toast.error('Error de conexión');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.push('/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Configuración de Moneda</CardTitle>
              <CardDescription>
                Selecciona la moneda que se utilizará en toda la aplicación
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="moneda">Moneda del sistema</Label>
            <Select
              value={monedaSeleccionada}
              onValueChange={(value) => setMonedaSeleccionada(value as Moneda)}
              disabled={!isAdmin}
            >
              <SelectTrigger id="moneda" className="w-full">
                <SelectValue placeholder="Selecciona una moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{currency.symbol}</span>
                      <span>{currency.name}</span>
                      <span className="text-muted-foreground text-sm">({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Solo los administradores pueden cambiar la moneda del sistema
              </p>
            )}
          </div>

          {isAdmin && monedaSeleccionada !== monedaActual && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Nota:</strong> Al cambiar la moneda, todos los valores monetarios en la aplicación 
                se mostrarán en la nueva moneda seleccionada. Los valores numéricos en la base de datos 
                no se modificarán, solo cambiará el formato de visualización.
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={guardarConfiguracion}
                disabled={saving || monedaSeleccionada === monedaActual}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              {monedaSeleccionada !== monedaActual && (
                <Button
                  variant="outline"
                  onClick={() => setMonedaSeleccionada(monedaActual)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo de la Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Logo de la Empresa</CardTitle>
              <CardDescription>Sube el logo que se mostrará en los recibos y en el panel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
            <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 overflow-hidden shadow-inner">
              {logoUrl ? (
                <img 
                  src={`/api/files/system/${encodeURIComponent(logoUrl)}`}
                  alt="Logo de la empresa"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <span className="text-xs">Sin logo</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Imagen del Logo</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recomendamos imágenes PNG con fondo transparente o JPG. Tamaño máximo: 5MB.
                </p>
              </div>
              
              <div className="flex justify-center md:justify-start">
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploadingLogo || !isAdmin}
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingLogo ? 'Subiendo...' : (logoUrl ? 'Cambiar Logo' : 'Subir Logo')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Input oculto para logo */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />

      {/* Sección de Respaldos de la Base de Datos */}
      <CardConfiguracionBackups isAdmin={isAdmin} />
    </div>
  );
}

interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: 'JSON' | 'SQL';
  counts?: Record<string, number>;
}

function CardConfiguracionBackups({ isAdmin }: { isAdmin: boolean }) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) {
      cargarRespaldos();
    }
  }, [isAdmin]);

  const cargarRespaldos = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.error('Error al cargar respaldos:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleGenerarRespaldo = async () => {
    if (!isAdmin) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' });
      if (res.ok) {
        toast.success('¡Respaldo generado exitosamente!');
        cargarRespaldos();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al generar el respaldo');
      }
    } catch (e) {
      toast.error('Error de red al intentar respaldar');
    } finally {
      setGenerating(false);
    }
  };

  const handleDescargar = (filename: string) => {
    window.open(`/api/admin/backups/${encodeURIComponent(filename)}`, '_blank');
  };

  const handleEliminar = async (filename: string) => {
    if (!confirm(`¿Estás seguro de eliminar el archivo de respaldo "${filename}"?`)) return;
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Respaldo eliminado correctamente');
        cargarRespaldos();
      } else {
        toast.error('Error al eliminar respaldo');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleRestaurarDesdeArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('⚠️ ALERTA DE SEGURIDAD:\n\nAl restaurar este respaldo, la base de datos actual será reemplazada con la información contenida en el archivo seleccionado.\n\n¿Deseas continuar?')) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || '¡Base de datos restaurada correctamente!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al restaurar respaldo');
      }
    } catch (e) {
      toast.error('Error de conexión durante la restauración');
    } finally {
      setRestoring(false);
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Respaldos y Seguridad (Backups)</CardTitle>
              <CardDescription>Genera, descarga y restaura copias de seguridad completas de tu sistema</CardDescription>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => restoreFileInputRef.current?.click()}
                disabled={restoring}
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <Upload className="mr-2 h-4 w-4" />
                {restoring ? 'Restaurando...' : 'Restaurar de Archivo'}
              </Button>

              <Button
                onClick={handleGenerarRespaldo}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {generating ? 'Generando...' : 'Generar Respaldo Ahora'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input oculto para restaurar respaldo */}
        <input
          type="file"
          ref={restoreFileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleRestaurarDesdeArchivo}
        />

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">🛡️ Protección Automática contra Pérdida de Datos:</p>
          <p>• Los respaldos automáticos se crean diariamente a las 02:00 AM y se retienen durante 30 días en la VPS.</p>
          <p>• Puedes hacer clic en <strong>Descargar</strong> en cualquier respaldo para guardarlo en tu computadora o celular.</p>
        </div>

        {loadingBackups ? (
          <div className="py-8 text-center text-gray-500 text-sm">Cargando respaldos guardados...</div>
        ) : backups.length === 0 ? (
          <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">
            No hay respaldos generados aún. Haz clic en <strong>Generar Respaldo Ahora</strong> para crear el primero.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-b">
                <tr>
                  <th className="p-3">Nombre de Archivo</th>
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Tamaño</th>
                  <th className="p-3">Contenido</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="p-3 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                      {b.filename}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">
                      {new Date(b.createdAt).toLocaleString('es-EC')}
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {b.sizeFormatted}
                    </td>
                    <td className="p-3 text-xs">
                      {b.counts ? (
                        <span className="text-gray-500 dark:text-gray-400">
                          👤 {b.counts.clientes || 0} clientes | 💵 {b.counts.prestamos || 0} préstamos | 💳 {b.counts.pagos || 0} pagos
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin detalles</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDescargar(b.filename)}
                        title="Descargar archivo a tu dispositivo"
                        className="text-xs"
                      >
                        Descargar 📥
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminar(b.filename)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                          title="Eliminar este respaldo"
                        >
                          Eliminar 🗑️
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

