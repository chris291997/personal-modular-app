import { useState, useEffect } from 'react';
import { getSiteSettings } from '../services/siteSettingsService';

export const useCurrency = () => {
  const [currencySymbol, setCurrencySymbol] = useState<string>('₱');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const settings = await getSiteSettings();
        setCurrencySymbol(settings.currencySymbol);
      } catch (error) {
        console.error('Error loading currency:', error);
        // Default to peso on error
        setCurrencySymbol('₱');
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const formatCurrencyNoDecimals = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(0)}`;
  };

  return {
    currencySymbol,
    formatCurrency,
    formatCurrencyNoDecimals,
    loading,
  };
};
