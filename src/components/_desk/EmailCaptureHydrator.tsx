"use client";

import { useEffect, useRef } from "react";
import { loadGuestbookSettingsAction } from "@/app/actions/settings";
import { useGuestbookSettings } from "@/lib/guestbookSettings";

export function EmailCaptureHydrator() {
  const [settings, , setSettings] = useGuestbookSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;

    loadGuestbookSettingsAction().then((next) => {
      if (cancelled) return;
      const current = settingsRef.current;
      if (current.captureEmail === next.captureEmail) return;
      setSettings({ ...current, captureEmail: next.captureEmail });
    });

    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  return null;
}
