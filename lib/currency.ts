// Configuración de monedas
export type Moneda = 'USD' | 'EUR' | 'MXN' | 'BRL' | 'ARS' | 'COP' | 'PEN' | 'USD_EC';

export interface CurrencyInfo {
  code: Moneda;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<Moneda, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'Dólar estadounidense',
    symbol: '$',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'es-ES',
    decimals: 2,
  },
  MXN: {
    code: 'MXN',
    name: 'Peso mexicano',
    symbol: '$',
    locale: 'es-MX',
    decimals: 2,
  },
  BRL: {
    code: 'BRL',
    name: 'Real brasileño',
    symbol: 'R$',
    locale: 'pt-BR',
    decimals: 2,
  },
  ARS: {
    code: 'ARS',
    name: 'Peso argentino',
    symbol: '$',
    locale: 'es-AR',
    decimals: 2,
  },
  COP: {
    code: 'COP',
    name: 'Peso colombiano',
    symbol: '$',
    locale: 'es-CO',
    decimals: 0,
  },
  PEN: {
    code: 'PEN',
    name: 'Sol peruano',
    symbol: 'S/',
    locale: 'es-PE',
    decimals: 2,
  },
  USD_EC: {
    code: 'USD_EC',
    name: 'Dólar (Ecuador)',
    symbol: '$',
    locale: 'es-EC',
    decimals: 2,
  },
};

/**
 * Formatea un número según la moneda especificada
 * @param amount - Cantidad a formatear
 * @param currency - Código de moneda
 * @param showSymbol - Si se debe mostrar el símbolo de moneda
 * @returns String formateado con la moneda
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: Moneda = 'USD',
  showSymbol: boolean = true
): string {
  if (amount === null || amount === undefined) return '';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '';

  const currencyInfo = CURRENCIES[currency];
  
  try {
    const formatted = new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    }).format(numericAmount);

    // Si no queremos mostrar el símbolo, lo removemos
    if (!showSymbol) {
      return formatted.replace(/[^\d.,\s-]/g, '').trim();
    }

    return formatted;
  } catch (error) {
    // Fallback a formato simple
    const symbol = showSymbol ? currencyInfo.symbol + ' ' : '';
    return symbol + numericAmount.toFixed(currencyInfo.decimals);
  }
}

/**
 * Obtiene el símbolo de una moneda
 */
export function getCurrencySymbol(currency: Moneda = 'USD'): string {
  return CURRENCIES[currency]?.symbol || '$';
}

/**
 * Obtiene el nombre de una moneda
 */
export function getCurrencyName(currency: Moneda = 'USD'): string {
  return CURRENCIES[currency]?.name || 'Dólar estadounidense';
}

/**
 * Obtiene la lista de todas las monedas disponibles
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES);
}
