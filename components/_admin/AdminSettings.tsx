"use client";

import { useState, useTransition } from "react";
import {
  loadGuestbookSettingsAction,
  saveGuestbookSettingsAction,
} from "@/app/actions/settings";
import {
  ACCENT_FONTS,
  MAIN_FONTS,
  useGuestbookSettings,
  type FontSize,
  type GuestbookSettings,
} from "@/lib/guestbookSettings";

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
  const [saved, saveContext, setSettings] = useGuestbookSettings();
  const [draft, setDraft] = useState<GuestbookSettings>(saved);
  const [prevSaved, setPrevSaved] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (prevSaved !== saved) {
    setPrevSaved(saved);
    setDraft(saved);
  }

  function patch(next: Partial<GuestbookSettings>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function undoChanges() {
    setError(null);
    startTransition(async () => {
      const fresh = await loadGuestbookSettingsAction();
      setSettings(fresh);
      setDraft(fresh);
    });
  }

  return (
    <div className="admin-settings-panel">
      <h2 className="admin-title">settings</h2>
      <p className="admin-lede">guestbook options.</p>
      <form
        className="admin-settings-list"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await saveGuestbookSettingsAction(draft);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            saveContext(result.settings);
            setDraft(result.settings);
          });
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
        <label className="admin-setting-field">
          <span className="admin-setting-label">placeholder</span>
          <textarea
            className="admin-filter admin-setting-allowlist"
            name="placeholder"
            rows={4}
            value={draft.placeholder}
            placeholder="Text shown in the comment box before someone writes."
            onChange={(event) => patch({ placeholder: event.target.value })}
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
        <div className="admin-setting-field">
          <div className="admin-setting-heading">
            <span className="admin-setting-label">custom theme</span>
            <a
              className="admin-comment-link"
              href="/admin/example.css"
              target="_blank"
              rel="noopener noreferrer"
            >
              view example
            </a>
          </div>
          <textarea
            className="admin-filter admin-setting-theme"
            name="custom-theme"
            rows={8}
            value={draft.customTheme}
            placeholder="Paste CSS overrides. Uses Tailwind."
            onChange={(event) => patch({ customTheme: event.target.value })}
          />
        </div>
        <div className="admin-setting-field admin-setting-rate-row">
          <span className="admin-setting-label" id="rate-limits-label">
            rate limits
          </span>
          <div
            className="admin-setting-rate-limits"
            role="group"
            aria-labelledby="rate-limits-label"
          >
            <input
              className="admin-filter admin-setting-rate"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              name="rate-limit-count"
              value={draft.rateLimitCount}
              aria-label="comments per interval"
              onChange={(event) =>
                patch({ rateLimitCount: event.target.value })
              }
            />
            <span>per</span>
            <input
              className="admin-filter admin-setting-rate"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              name="rate-limit-minutes"
              value={draft.rateLimitMinutes}
              aria-label="interval in minutes"
              onChange={(event) =>
                patch({ rateLimitMinutes: event.target.value })
              }
            />
            <span>min.,</span>
            <input
              className="admin-filter admin-setting-rate"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              name="rate-limit-daily"
              value={draft.rateLimitDaily}
              aria-label="comments per day"
              onChange={(event) =>
                patch({ rateLimitDaily: event.target.value })
              }
            />
            <span>total / day</span>
          </div>
        </div>
        <label className="admin-setting-field">
          <span className="admin-setting-label">profanity allow-list</span>
          <textarea
            className="admin-filter admin-setting-allowlist"
            name="profanity-allow-list"
            rows={4}
            value={draft.profanityAllowList}
            placeholder="Words to allow through the filter. Enter in comma separated list."
            onChange={(event) =>
              patch({ profanityAllowList: event.target.value })
            }
          />
        </label>
        {error ? (
          <p className="comment-error" role="alert">
            {error}
          </p>
        ) : null}
        <nav className="admin-settings-actions" aria-label="Save settings">
          <button
            type="button"
            className="admin-comment-link"
            disabled={pending}
            onClick={undoChanges}
          >
            undo changes
          </button>
          <button type="submit" className="admin-comment-link" disabled={pending}>
            save changes
          </button>
        </nav>
      </form>
    </div>
  );
}
