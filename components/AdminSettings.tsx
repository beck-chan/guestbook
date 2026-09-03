"use client";

import { useEffect, useState } from "react";
import {
  useGuestbookSettings,
  type FontSize,
  type GuestbookSettings,
} from "@/lib/guestbookSettings";

const MAIN_FONTS = [
  { value: "futura-pt", label: "futura pt" },
  { value: "jost", label: "jost" },
  { value: "baskerville", label: "libre baskerville" },
  { value: "kaisei", label: "kaisei haruno umi" },
  { value: "times", label: "times new roman" },
];

const ACCENT_FONTS = [
  { value: "peony", label: "peony" },
  { value: "hello-honey", label: "hello honey" },
  { value: "comic-sans", label: "comic sans" },
  { value: "futura-pt", label: "futura pt" },
];

const PAGE_SIZES = [4, 5, 6, 7, 8, 9, 10] as const;

const FONT_SIZES = [
  { value: "smaller", label: "smaller" },
  { value: "regular", label: "regular" },
  { value: "larger", label: "larger" },
] as const;

function OnOffToggle({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="admin-setting-field">
      <span className="admin-setting-label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className="admin-setting-toggle"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <button
          type="button"
          className={value ? "is-active" : ""}
          aria-pressed={value}
          onClick={() => onChange(true)}
        >
          on
        </button>
        <button
          type="button"
          className={value ? "" : "is-active"}
          aria-pressed={!value}
          onClick={() => onChange(false)}
        >
          off
        </button>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [saved, save] = useGuestbookSettings();
  const [draft, setDraft] = useState<GuestbookSettings>(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  function patch(next: Partial<GuestbookSettings>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <div className="admin-settings-panel">
      <h2 className="admin-title">settings</h2>
      <p className="admin-lede">guestbook options.</p>
      <form
        className="admin-settings-list"
        onSubmit={(event) => {
          event.preventDefault();
          save(draft);
        }}
      >
        <label className="admin-setting-field">
          <span className="admin-setting-label">title</span>
          <input
            className="admin-filter"
            type="text"
            name="title"
            value={draft.title}
            placeholder="guestbook"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <OnOffToggle
          id="marquee"
          label="marquee"
          value={draft.marquee}
          onChange={(value) => patch({ marquee: value })}
        />
        <label className="admin-setting-field">
          <span className="admin-setting-label">main font</span>
          <select
            className="admin-filter admin-filter-select"
            name="main-font"
            value={draft.mainFont}
            onChange={(event) => patch({ mainFont: event.target.value })}
          >
            {MAIN_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-setting-field">
          <span className="admin-setting-label">font size</span>
          <select
            className="admin-filter admin-filter-select"
            name="main-font-size"
            value={draft.mainFontSize}
            onChange={(event) =>
              patch({ mainFontSize: event.target.value as FontSize })
            }
          >
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-setting-field">
          <span className="admin-setting-label">accent font</span>
          <select
            className="admin-filter admin-filter-select"
            name="accent-font"
            value={draft.accentFont}
            onChange={(event) => patch({ accentFont: event.target.value })}
          >
            {ACCENT_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-setting-field">
          <span className="admin-setting-label">font size</span>
          <select
            className="admin-filter admin-filter-select"
            name="accent-font-size"
            value={draft.accentFontSize}
            onChange={(event) =>
              patch({ accentFontSize: event.target.value as FontSize })
            }
          >
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-setting-field">
          <span className="admin-setting-label">comments per page</span>
          <select
            className="admin-filter admin-filter-select"
            name="comments-per-page"
            value={draft.pageSize}
            onChange={(event) => patch({ pageSize: event.target.value })}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <OnOffToggle
          id="capture-email"
          label="capture email"
          value={draft.captureEmail}
          onChange={(value) => patch({ captureEmail: value })}
        />
        <label className="admin-setting-field">
          <span className="admin-setting-label">custom theme</span>
          <textarea
            className="admin-filter admin-setting-theme"
            name="custom-theme"
            rows={8}
            value={draft.customTheme}
            placeholder="paste css…"
            onChange={(event) => patch({ customTheme: event.target.value })}
          />
        </label>
        <nav className="admin-settings-actions" aria-label="Save settings">
          <button
            type="button"
            className="admin-comment-link"
            onClick={() => setDraft(saved)}
          >
            undo changes
          </button>
          <button type="submit" className="admin-comment-link">
            save changes
          </button>
        </nav>
      </form>
    </div>
  );
}
