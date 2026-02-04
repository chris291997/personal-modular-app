import { useEffect, useState } from 'react';
import { getSiteSettings, updateSiteSettings, SiteSettings } from '../../services/siteSettingsService';
import { getCurrentUser, isAdmin } from '../../services/authService';
import { Settings, Save, AlertCircle } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export default function SiteSettingsModule() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user || !isAdmin(user)) {
      setError('Access denied. Only administrators can access site settings.');
      setLoading(false);
      return;
    }

    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSiteSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load site settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await updateSiteSettings(settings);
      setSuccess(true);
      
      // Clear currency cache so changes take effect immediately
      const { clearCurrencyCache } = await import('../../utils/currency');
      clearCurrencyCache();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
    if (currency && settings) {
      setSettings({
        ...settings,
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };

  if (!user || !isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Access Denied</h2>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Only administrators can access site settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-6 h-6 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Site Settings
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            Configure global application settings (Admin only)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Save className="w-5 h-5" />
              <span className="font-medium">Settings saved successfully!</span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          <div className="space-y-6">
            {/* Currency Settings */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Currency
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Currency Code
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="₱"
                    maxLength={5}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This symbol will be used throughout the app to display amounts
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Preview:</strong> {settings.currencySymbol}1,234.56
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
