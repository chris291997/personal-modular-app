import { getSiteSettings } from '../services/siteSettingsService';

let cachedSettings: { currency: string; currencySymbol: string } | null = null;
let settingsPromise: Promise<{ currency: string; currencySymbol: string }> | null = null;

// Get currency settings (with caching)
async function getCurrencySettings(): Promise<{ currency: string; currencySymbol: string }> {
  if (cachedSettings) {
    return cachedSettings;
  }
  
  if (settingsPromise) {
    return settingsPromise;
  }
  
  settingsPromise = getSiteSettings().then(settings => {
    cachedSettings = {
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
    };
    return cachedSettings;
  });
  
  return settingsPromise;
}

// Format amount with currency symbol
export const formatCurrency = async (amount: number): Promise<string> => {
  const settings = await getCurrencySettings();
  return `${settings.currencySymbol}${amount.toFixed(2)}`;
};

// Format amount with currency symbol (synchronous - uses cached value or default)
export const formatCurrencySync = (amount: number, currencySymbol: string = '₱'): string => {
  return `${currencySymbol}${amount.toFixed(2)}`;
};

// Get currency symbol (async)
export const getCurrencySymbol = async (): Promise<string> => {
  const settings = await getCurrencySettings();
  return settings.currencySymbol;
};

// Get currency symbol (sync - uses cached or default)
export const getCurrencySymbolSync = (): string => {
  return cachedSettings?.currencySymbol || '₱';
};

// Clear cache (useful when settings are updated)
export const clearCurrencyCache = (): void => {
  cachedSettings = null;
  settingsPromise = null;
};
