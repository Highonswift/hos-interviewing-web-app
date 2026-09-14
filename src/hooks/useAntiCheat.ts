'use client';

import { useState, useEffect } from 'react';

export function useAntiCheat() {
  const[tabSwitchCount, setTabSwitchCount] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchCount((prev) => prev + 1);
        alert('Warning: Tab switching is not allowed. This action has been recorded.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },[]);

  return { tabSwitchCount };
}