'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllCurrencies, type Moneda } from '@/lib/currency';

export default function ConfiguracionClient() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [monedaActual, setMonedaActual] = useState<Moneda>('USD');
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<Moneda>('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monedas disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">{currency.symbol}</div>
                  <div>
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-sm text-muted-foreground">{currency.code}</p>
                  </div>
                </div>
                {currency.code === monedaActual && (
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs font-medium">
                    Actual
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
