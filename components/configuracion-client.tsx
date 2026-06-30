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
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 border rounded-lg bg-gray-50/50">
            <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-white overflow-hidden shadow-inner">
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
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Imagen del Logo</h4>
                <p className="text-xs text-gray-500">
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
    </div>
  );
}
