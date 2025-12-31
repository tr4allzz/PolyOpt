'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { LPWrapped } from './lp-wrapped';

interface WrappedContextType {
  showWrapped: () => void;
  hideWrapped: () => void;
}

const WrappedContext = createContext<WrappedContextType | null>(null);

export function useWrapped() {
  const context = useContext(WrappedContext);
  if (!context) {
    throw new Error('useWrapped must be used within WrappedProvider');
  }
  return context;
}

const WRAPPED_SHOWN_KEY = 'polymarket-wrapped-shown-2025';

export function WrappedProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [showPopup, setShowPopup] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check if we should show wrapped after wallet connection
    if (isConnected && address && !hasChecked) {
      setHasChecked(true);

      // Check if user has already seen wrapped this session
      const shownKey = `${WRAPPED_SHOWN_KEY}-${address.toLowerCase()}`;
      const hasShown = sessionStorage.getItem(shownKey);

      if (!hasShown) {
        // Small delay to let the UI settle after login
        const timer = setTimeout(() => {
          setShowPopup(true);
          sessionStorage.setItem(shownKey, 'true');
        }, 1500);

        return () => clearTimeout(timer);
      }
    }

    // Reset check when wallet disconnects
    if (!isConnected) {
      setHasChecked(false);
    }
  }, [isConnected, address, hasChecked]);

  const showWrapped = () => setShowPopup(true);
  const hideWrapped = () => setShowPopup(false);

  return (
    <WrappedContext.Provider value={{ showWrapped, hideWrapped }}>
      {children}
      {address && (
        <LPWrapped
          walletAddress={address}
          open={showPopup}
          onOpenChange={setShowPopup}
        />
      )}
    </WrappedContext.Provider>
  );
}
