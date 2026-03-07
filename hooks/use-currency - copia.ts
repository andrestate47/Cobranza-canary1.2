'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getCurrencySymbol, type Moneda } from '@/lib/currency';

export function useCurrency() {
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMoneda();
  }, []);

  const cargarMoneda = async () => {
    try {
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const config = await response.json();
        setMoneda(config.moneda);
      }
    } catch (error) {
      console.error('Error al cargar moneda:', error);
    } finally {
      setLoading(false);
    }
  };

  const format = (amount: number | string | null | undefined, showSymbol: boolean = true) => {
    return formatCurrency(amount, moneda, showSymbol);
  };

  const symbol = getCurrencySymbol(moneda);

  return {
    moneda,
    format,
    symbol,
    loading,
  };
}
