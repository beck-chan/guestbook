"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_GUESTBOOK_SETTINGS,
  type GuestbookSettings,
} from "@/lib/guestbookSettingsShared";

export type {
  FontSize,
  GuestbookSettings,
} from "@/lib/guestbookSettingsShared";

export {
  ACCENT_FONTS,
  MAIN_FONTS,
  guestbookCommentLength,
  guestbookCommentPlaceholder,
  guestbookDisplayTitle,
  guestbookPageSize,
  guestbookThemeVars,
} from "@/lib/guestbookSettingsShared";

type SettingsContextValue = {
  settings: GuestbookSettings;
  setSettings: (next: GuestbookSettings) => void;
};

const GuestbookSettingsContext = createContext<SettingsContextValue | null>(
  null,
);

export function GuestbookSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings?: GuestbookSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<GuestbookSettings>(
    initialSettings ?? DEFAULT_GUESTBOOK_SETTINGS,
  );

  return (
    <GuestbookSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </GuestbookSettingsContext.Provider>
  );
}

export function useGuestbookDocumentTitle(title: string) {
  useLayoutEffect(() => {
    const apply = () => {
      if (document.title !== title) {
        document.title = title;
      }
      for (const node of document.querySelectorAll("title")) {
        if (node.textContent !== title) {
          node.textContent = title;
        }
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [title]);
}

export function useGuestbookSettings() {
  const context = useContext(GuestbookSettingsContext);
  if (!context) {
    throw new Error(
      "useGuestbookSettings must be used within GuestbookSettingsProvider",
    );
  }
  const { settings, setSettings } = context;

  function save(next: GuestbookSettings | Partial<GuestbookSettings>) {
    if (
      typeof next === "object" &&
      next !== null &&
      "title" in next &&
      "placeholder" in next &&
      "pageSize" in next &&
      "mainFont" in next
    ) {
      setSettings(next as GuestbookSettings);
      return;
    }
    setSettings({ ...settings, ...next });
  }

  return [settings, save, setSettings] as const;
}
