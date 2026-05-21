import { createContext, useContext, useState } from 'react';

export const CURRENCIES = [
  { code: 'DZD', label: 'Dinar Algérien', symbol: 'DA',  locale: 'fr-DZ' },
  { code: 'MAD', label: 'Dirham Marocain', symbol: 'DH', locale: 'fr-MA' },
  { code: 'TND', label: 'Dinar Tunisien',  symbol: 'DT', locale: 'fr-TN' },
  { code: 'CHF', label: 'Franc Suisse',    symbol: 'CHF', locale: 'fr-CH' },
  { code: 'EUR', label: 'Euro',            symbol: '€',  locale: 'fr-FR' },
  { code: 'USD', label: 'Dollar US',       symbol: '$',  locale: 'en-US' },
];

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [code, setCode] = useState(
    () => localStorage.getItem('app_currency') || 'DZD'
  );

  const currency = CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];

  function changeCurrency(newCode) {
    localStorage.setItem('app_currency', newCode);
    setCode(newCode);
  }

  function format(amount) {
    if (amount == null) return `0.00 ${currency.symbol}`;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formatted = new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return currency.code === 'USD'
      ? `$${formatted}`
      : `${formatted} ${currency.symbol}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
