import { useState, useEffect } from 'react';
import './InstallPWA.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect if device is iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

// Detect if device is Android
const isAndroid = /Android/.test(navigator.userAgent);

// Detect if device is mobile
const isMobile = isIOS || isAndroid || window.innerWidth <= 768;

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    // For mobile devices, show the prompt after a delay
    if (isMobile && !isInstalled) {
      // Show after 3 seconds on mobile
      const timer = setTimeout(() => {
        setShowInstallButton(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Listen for the beforeinstallprompt event (mainly for Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Desktop: Use the native prompt
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallButton(false);
      } catch (error) {
        console.error('Error showing install prompt:', error);
        // Fall through to show instructions
      }
    }
    
    // For iOS or if prompt failed, show instructions
    if (isIOS || !deferredPrompt) {
      // Show iOS instructions
      alert(
        'To install this app:\n\n' +
        '1. Tap the Share button (square with arrow)\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" to confirm'
      );
      setShowInstallButton(false);
      handleDismiss(); // Don't show again for 7 days
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowInstallButton(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  // Don't show if no install prompt available (unless mobile)
  if (!showInstallButton && !isMobile) {
    return null;
  }

  // On mobile, always show if not dismissed
  if (isMobile && !showInstallButton && !dismissed) {
    return null; // Will show after delay
  }

  return (
    <div className="install-pwa-banner">
      <div className="install-pwa-content">
        <div className="install-pwa-text">
          <strong>📱 Install App</strong>
          <span>
            {isIOS 
              ? 'Add this app to your home screen for quick access'
              : 'Install this app on your device for a better experience'
            }
          </span>
        </div>
        <div className="install-pwa-actions">
          <button onClick={handleInstallClick} className="install-btn">
            {isIOS ? 'Show Instructions' : 'Install'}
          </button>
          <button 
            onClick={handleDismiss} 
            className="dismiss-btn"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
