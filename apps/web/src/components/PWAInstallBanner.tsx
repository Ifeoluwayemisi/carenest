import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone) {
      // Deferred to a microtask (react-hooks/set-state-in-effect forbids a
      // synchronous setState call in the effect body).
      void Promise.resolve().then(() => setIsInstalled(true));
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If dismissed recently, respect user
    const dismissed = localStorage.getItem('carenest_pwa_dismissed');
    if (!dismissed) {
      // Show gentle prompt on mobile/tablet devices
      const timer = setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowBanner(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } else {
      // Helpful guide for iOS/desktop Chrome if beforeinstallprompt is not triggered directly
      alert('To install CareNest on your device:\n\n1. On Android/Chrome: Tap browser menu (⋮) -> "Install App" or "Add to Home Screen".\n2. On iOS/Safari: Tap the Share button (⎋) -> "Add to Home Screen".\n\nCareNest works completely offline once installed!');
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('carenest_pwa_dismissed', 'true');
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-700/80 flex items-center justify-center shrink-0 border border-teal-500/30">
          <Smartphone className="w-4 h-4 text-teal-200" />
        </div>
        <div>
          <span className="font-semibold text-white">Install CareNest App</span>
          <span className="text-teal-200 text-xs hidden sm:inline ml-1.5">
            — Works without internet in rural clinics. Fast 1-tap home screen access.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-teal-900 font-semibold text-xs px-3 py-1.5 rounded-lg shadow hover:bg-teal-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install PWA</span>
        </button>
        <button
          onClick={handleDismiss}
          className="text-teal-300 hover:text-white p-1 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
