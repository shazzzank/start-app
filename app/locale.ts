import type { ShopCurrency } from '@/app/types';

const countryCurrency: Record<string, ShopCurrency> = {
  IN: 'INR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'AUD',
  JP: 'JPY', KR: 'KRW', SG: 'SGD', AE: 'AED', SA: 'AED', QA: 'AED',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  CH: 'EUR', SE: 'EUR', NO: 'EUR', DK: 'EUR', PL: 'EUR', CZ: 'EUR',
  MX: 'USD', BR: 'USD', PH: 'USD', MY: 'SGD', TH: 'SGD', HK: 'USD', TW: 'USD',
};

const ratesFromInr: Record<ShopCurrency, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.78,
  KRW: 16.2,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  AED: 0.044,
};

const currencyLocale: Record<ShopCurrency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  KRW: 'ko-KR',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  AED: 'en-AE',
};

const zeroDecimal = new Set<ShopCurrency>(['INR', 'JPY', 'KRW']);

export function currencyForCountry(country: string): ShopCurrency {
  return countryCurrency[country.toUpperCase()] ?? 'USD';
}

export function formatPrice(amountInInr: number, currency: ShopCurrency) {
  const converted = zeroDecimal.has(currency)
    ? Math.round(amountInInr * ratesFromInr[currency])
    : Math.round(amountInInr * ratesFromInr[currency] * 100) / 100;
  return new Intl.NumberFormat(currencyLocale[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
  }).format(converted);
}
