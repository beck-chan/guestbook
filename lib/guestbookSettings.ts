"use client";

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";

export type FontSize = "smaller" | "regular" | "larger";

export type GuestbookSettings = {
  title: string;
  marquee: boolean;
  captureEmail: boolean;
  mainFont: string;
  mainFontSize: FontSize;
  accentFont: string;
  accentFontSize: FontSize;
  pageSize: string;
  customTheme: string;
};

export const DEFAULT_GUESTBOOK_SETTINGS: GuestbookSettings = {
  title: "",
  marquee: true,
  captureEmail: true,
  mainFont: "futura-pt",
  mainFontSize: "regular",
  accentFont: "peony",
  accentFontSize: "regular",
  pageSize: "10",
  customTheme: "",
};

const STORAGE_KEY = "guestbook-settings";
const CHANGE_EVENT = "guestbook-settings-change";

function parse(raw: string | null): GuestbookSettings {
  if (!raw) {
    return { ...DEFAULT_GUESTBOOK_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GuestbookSettings>;
    return { ...DEFAULT_GUESTBOOK_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_GUESTBOOK_SETTINGS };
  }
}

function serialize(settings: GuestbookSettings) {
  return JSON.stringify(settings);
}

function readSnapshot() {
  try {
    return serialize(parse(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    return serialize(DEFAULT_GUESTBOOK_SETTINGS);
  }
}

const SERVER_SNAPSHOT = serialize(DEFAULT_GUESTBOOK_SETTINGS);

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  return readSnapshot();
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function guestbookDisplayTitle(title: string) {
  const trimmed = title.trim();
  return trimmed || "guestbook";
}

const FONT_STACKS: Record<string, string> = {
  "futura-pt": '"futura-pt", var(--font-jost), Jost, sans-serif',
  jost: "var(--font-jost), Jost, sans-serif",
  baskerville: 'var(--font-baskerville), "Libre Baskerville", serif',
  kaisei: 'var(--font-kaisei), "Kaisei HarunoUmi", serif',
  times: '"Times New Roman", Times, serif',
  peony: "Peony, cursive",
  "hello-honey": '"Hello Honey", cursive',
  "comic-sans": '"Comic Sans MS", "Comic Sans", cursive',
};

const SIZE_SCALE: Record<FontSize, string> = {
  smaller: "0.88",
  regular: "1",
  larger: "1.18",
};

export function guestbookPageSize(pageSize: string) {
  const parsed = Number.parseInt(pageSize, 10);
  return Number.isFinite(parsed) && parsed >= 4 && parsed <= 10 ? parsed : 10;
}

export function guestbookThemeVars(settings: GuestbookSettings): CSSProperties {
  return {
    "--guestbook-main-font":
      FONT_STACKS[settings.mainFont] ?? FONT_STACKS["futura-pt"],
    "--guestbook-accent-font":
      FONT_STACKS[settings.accentFont] ?? FONT_STACKS.peony,
    "--guestbook-main-scale": SIZE_SCALE[settings.mainFontSize] ?? "1",
    "--guestbook-accent-scale": SIZE_SCALE[settings.accentFontSize] ?? "1",
  } as CSSProperties;
}

export function useGuestbookSettings() {
  const json = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const settings = useMemo(() => parse(json), [json]);

  function update(patch: Partial<GuestbookSettings>) {
    const next = { ...settings, ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(next));
    } catch {
      // ignore quota / private mode
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return [settings, update] as const;
}
