import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server';
import type { Currency, Locale } from '@/app/types';

const countryCurrency: Record<string, Currency> = {
  IN: 'INR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'AUD',
  JP: 'JPY', KR: 'KRW', SG: 'SGD', AE: 'AED', SA: 'AED', QA: 'AED',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  CH: 'EUR', SE: 'EUR', NO: 'EUR', DK: 'EUR', PL: 'EUR', CZ: 'EUR',
  MX: 'USD', BR: 'USD', PH: 'USD', MY: 'SGD', TH: 'SGD', HK: 'USD', TW: 'USD',
};

const ratesFromInr: Record<Currency, number> = {
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

const currencyLocale: Record<Currency, string> = {
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

const zeroDecimal = new Set<Currency>(['INR', 'JPY', 'KRW']);
const defaultCountry = 'IN';
const defaultCurrency: Currency = 'INR';

function isPrivateIp(ip: string) {
  if (ip) {
    if (ip === '127.0.0.1' || ip === '::1') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
    if (ip.startsWith('fc00:') || ip.startsWith('fd')) return true;
    const private172 = ip.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
    return false;
  }
  return true;
}

function isCountryCode(value: string | null | undefined) {
  return !!value && value.length === 2 && value !== 'XX' && /^[A-Z]{2}$/i.test(value);
}

function edgeCountryCode() {
  const raw = getRequestHeader('cf-ipcountry')
    ?? getRequestHeader('x-vercel-ip-country')
    ?? getRequestHeader('x-country-code')
    ?? getRequestHeader('fly-client-country');
  return isCountryCode(raw) ? raw!.toUpperCase() : null;
}

async function countryFromIp(ip: string) {
  if (isPrivateIp(ip)) return defaultCountry;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code,success`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as { success?: boolean; country_code?: string };
      if (data.success && isCountryCode(data.country_code)) return data.country_code!.toUpperCase();
    }
  } catch {}
  return defaultCountry;
}

export function currencyForCountry(country: string): Currency {
  return countryCurrency[country.toUpperCase()] ?? defaultCurrency;
}

export async function resolveLocale(): Promise<Locale> {
  const edgeCountry = edgeCountryCode();
  const country = edgeCountry ?? await countryFromIp(getRequestIP({ xForwardedFor: true }) ?? '');
  return { country, currency: currencyForCountry(country) };
}

export function formatPrice(amount: number, currency: Currency) {
  const converted = zeroDecimal.has(currency)
    ? Math.round(amount * ratesFromInr[currency])
    : Math.round(amount * ratesFromInr[currency] * 100) / 100;
  return new Intl.NumberFormat(currencyLocale[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
  }).format(converted);
}
