"use client";

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";

export type FontSize = "smaller" | "regular" | "larger";

export type GuestbookSettings = {
  title: string;
  placeholder: string;
  marquee: boolean;
  captureEmail: boolean;
  mainFont: string;
  mainFontSize: FontSize;
  accentFont: string;
  accentFontSize: FontSize;
  pageSize: string;
  rateLimitCount: string;
  rateLimitMinutes: string;
  rateLimitDaily: string;
  profanityAllowList: string;
  customTheme: string;
};

export const DEFAULT_COMMENT_PLACEHOLDER =
  "Sign the guestbook! Yes, just like it's 2001.\nNo editing, no deleting, just thoughts into the void.\n\n(Please be kind.)";

export const MAIN_FONTS = [
  { value: "futura-pt", label: "futura pt" },
  { value: "jost", label: "jost" },
  { value: "baskerville", label: "libre baskerville" },
  { value: "kaisei", label: "kaisei haruno umi" },
] as const;

export const ACCENT_FONTS = [
  { value: "peony", label: "peony" },
  { value: "hello-honey", label: "hello honey" },
  { value: "futura-pt", label: "futura pt" },
] as const;

export const DEFAULT_GUESTBOOK_SETTINGS: GuestbookSettings = {
  title: "",
  placeholder: DEFAULT_COMMENT_PLACEHOLDER,
  marquee: true,
  captureEmail: true,
  mainFont: "futura-pt",
  mainFontSize: "regular",
  accentFont: "peony",
  accentFontSize: "regular",
  pageSize: "10",
  rateLimitCount: "1",
  rateLimitMinutes: "5",
  rateLimitDaily: "2",
  profanityAllowList: "",
  customTheme: "",
};

const MAIN_FONT_VALUES = new Set<string>(MAIN_FONTS.map((font) => font.value));
const ACCENT_FONT_VALUES = new Set<string>(
  ACCENT_FONTS.map((font) => font.value),
);

const STORAGE_KEY = "guestbook-settings";
const CHANGE_EVENT = "guestbook-settings-change";

function parse(raw: string | null): GuestbookSettings {
  if (!raw) {
    return { ...DEFAULT_GUESTBOOK_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GuestbookSettings>;
    const next = { ...DEFAULT_GUESTBOOK_SETTINGS, ...parsed };
    if (!MAIN_FONT_VALUES.has(next.mainFont)) {
      next.mainFont = DEFAULT_GUESTBOOK_SETTINGS.mainFont;
    }
    if (!ACCENT_FONT_VALUES.has(next.accentFont)) {
      next.accentFont = DEFAULT_GUESTBOOK_SETTINGS.accentFont;
    }
    return next;
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

export function guestbookCommentPlaceholder(placeholder: string) {
  const trimmed = placeholder.trim();
  return trimmed || DEFAULT_COMMENT_PLACEHOLDER;
}

const FONT_STACKS: Record<string, string> = {
  "futura-pt": '"futura-pt", var(--font-jost), Jost, sans-serif',
  jost: "var(--font-jost), Jost, sans-serif",
  baskerville: 'var(--font-baskerville), "Libre Baskerville", serif',
  kaisei: 'var(--font-kaisei), "Kaisei HarunoUmi", serif',
  peony: "Peony, cursive",
  "hello-honey": '"Hello Honey", cursive',
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
