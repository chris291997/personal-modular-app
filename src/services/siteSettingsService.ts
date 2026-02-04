import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface SiteSettings {
  currency: string;
  currencySymbol: string;
  updatedAt: Date;
}

const SETTINGS_DOC_ID = 'site-settings';

// Get site settings (defaults to peso if not set)
export const getSiteSettings = async (): Promise<SiteSettings> => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID));
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        currency: data.currency || 'PHP',
        currencySymbol: data.currencySymbol || '₱',
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    }
    
    // Return default settings (Peso)
    return {
      currency: 'PHP',
      currencySymbol: '₱',
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error fetching site settings:', error);
    // Return default on error
    return {
      currency: 'PHP',
      currencySymbol: '₱',
      updatedAt: new Date(),
    };
  }
};

// Update site settings (admin only)
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
  try {
    const currentSettings = await getSiteSettings();
    const updatedSettings: SiteSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date(),
    };
    
    await setDoc(
      doc(db, 'settings', SETTINGS_DOC_ID),
      {
        currency: updatedSettings.currency,
        currencySymbol: updatedSettings.currencySymbol,
        updatedAt: Timestamp.fromDate(updatedSettings.updatedAt),
      }
    );
  } catch (error) {
    console.error('Error updating site settings:', error);
    throw new Error('Failed to update site settings');
  }
};
