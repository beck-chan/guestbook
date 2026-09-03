"use client";

import { useState } from "react";

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

export function AdminSettings() {
  const [title, setTitle] = useState("");
  const [marquee, setMarquee] = useState(true);
  const [mainFont, setMainFont] = useState("futura-pt");
  const [mainFontSize, setMainFontSize] = useState("regular");
  const [accentFont, setAccentFont] = useState("peony");
  const [accentFontSize, setAccentFontSize] = useState("regular");
  const [pageSize, setPageSize] = useState("10");
  const [captureEmail, setCaptureEmail] = useState(true);
  const [customTheme, setCustomTheme] = useState("");

  return (
    <div className="admin-settings-panel">
      <h2 className="admin-title">settings</h2>
      <p className="admin-lede">guestbook options.</p>
      <form
        className="admin-settings-list"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="admin-setting-field">
          <span className="admin-setting-label">title</span>
          <input
            className="admin-filter"
            type="text"
            name="title"
            value={title}
            placeholder="guestbook"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="admin-setting-field">
          <span className="admin-setting-label" id="marquee-label">
            marquee
          </span>
          <div
            className="admin-setting-toggle"
            role="group"
            aria-labelledby="marquee-label"
          >
            <button
              type="button"
              className={marquee ? "is-active" : ""}
              aria-pressed={marquee}
              onClick={() => setMarquee(true)}
            >
              on
            </button>
            <button
              type="button"
              className={marquee ? "" : "is-active"}
              aria-pressed={!marquee}
              onClick={() => setMarquee(false)}
            >
              off
            </button>
          </div>
        </div>
        <label className="admin-setting-field">
          <span className="admin-setting-label">main font</span>
          <select
            className="admin-filter admin-filter-select"
            name="main-font"
            value={mainFont}
            onChange={(event) => setMainFont(event.target.value)}
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
            value={mainFontSize}
            onChange={(event) => setMainFontSize(event.target.value)}
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
            value={accentFont}
            onChange={(event) => setAccentFont(event.target.value)}
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
            value={accentFontSize}
            onChange={(event) => setAccentFontSize(event.target.value)}
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
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-setting">
          <input
            type="checkbox"
            name="capture-email"
            checked={captureEmail}
            onChange={(event) => setCaptureEmail(event.target.checked)}
          />
          capture email
        </label>
        <label className="admin-setting-field">
          <span className="admin-setting-label">custom theme</span>
          <textarea
            className="admin-filter admin-setting-theme"
            name="custom-theme"
            rows={8}
            value={customTheme}
            placeholder="paste css…"
            onChange={(event) => setCustomTheme(event.target.value)}
          />
        </label>
      </form>
    </div>
  );
}
