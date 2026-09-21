"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function messageText(message: UIMessage) {
  return (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function subscribeNever() {
  return () => {};
}

function chatHref(href: string | undefined) {
  if (!href) return undefined;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    if (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      url.protocol === "mailto:"
    ) {
      return href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function summaryBody(text: string) {
  const parts = text.split(/^## Summary\s*$/m);
  if (parts.length < 2) return text.trim();
  return parts.slice(1).join("").trim();
}

function formatChatQuotaError(raw: string) {
  const match = raw.match(
    /Chat quota reached — try again after (\S+?)\.?/i,
  );
  if (!match) return raw;
  const when = new Date(match[1]);
  if (Number.isNaN(when.getTime())) return raw;
  return `Chat quota reached — try again after ${when.toLocaleString()}.`;
}

function RetrievingBubble({
  label = "Retrieving responses ...",
}: {
  label?: string;
}) {
  return (
    <div className="docs-chat-bubble docs-chat-bubble-assistant">
      <p className="docs-chat-retrieving" role="status" aria-live="polite">
        {label}
      </p>
    </div>
  );
}

function ChatMarkdown({ text }: { text: string }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          const safe = chatHref(href);
          if (!safe) return <>{children}</>;
          if (safe.startsWith("/") || safe.startsWith("#")) {
            return <Link href={safe}>{children}</Link>;
          }
          return (
            <a href={safe} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// Path from Bootstrap Icons `bi-box-arrow-up-right` (MIT)
function PopoutGlyph() {
  return (
    <svg className="docs-chat-max-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"
      />
    </svg>
  );
}

// Path from Bootstrap Icons `bi-arrows-angle-contract` (MIT)
function ContractGlyph() {
  return (
    <svg className="docs-chat-max-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707M15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707"
      />
    </svg>
  );
}

export function DocsChatPanel({
  onMaximizedChange,
}: {
  onMaximizedChange?: (maximized: boolean) => void;
}) {
  const [maximized, setMaximized] = useState(false);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/docs/chat" }),
    [],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  useEffect(() => {
    onMaximizedChange?.(maximized);
    return () => onMaximizedChange?.(false);
  }, [maximized, onMaximizedChange]);

  useEffect(() => {
    let cancelled = false;
    fetch("/docs/chat")
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data: { messages?: UIMessage[] }) => {
        if (cancelled) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, maximized]);

  useEffect(() => {
    if (!maximized) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMaximized(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [maximized]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    await sendMessage({ text });
  }

  const busy = !ready || status === "streaming" || status === "submitted";
  const hasAnswers = messages.some(
    (message) => message.role === "assistant" && messageText(message),
  );

  async function onClearChat() {
    if (clearing || busy) return;
    setClearing(true);
    try {
      const res = await fetch("/docs/chat", { method: "DELETE" });
      if (!res.ok) return;
      setMessages([]);
      setInput("");
    } finally {
      setClearing(false);
    }
  }

  const lastMessage = messages[messages.length - 1];
  const lastText = lastMessage ? messageText(lastMessage) : "";
  const waitingOnSummary =
    status === "submitted" ||
    (status === "streaming" &&
      (!lastMessage ||
        lastMessage.role !== "assistant" ||
        !summaryBody(lastText)));
  const retrievingBanner =
    ready &&
    waitingOnSummary &&
    (!lastMessage ||
      lastMessage.role !== "assistant" ||
      !/^## Summary/m.test(lastText));

  const panel = (
    <div
      className={
        maximized ? "docs-chat-panel docs-chat-panel-max" : "docs-chat-panel"
      }
      role="dialog"
      aria-label="Docs chat"
      aria-modal={maximized}
    >
      <div className="docs-chat-head">
        <p className="docs-chat-title">Ask the Documentation</p>
        <button
          type="button"
          className="docs-chat-max"
          aria-label={maximized ? "Restore chat" : "Maximize chat"}
          onClick={() => setMaximized((value) => !value)}
        >
          {maximized ? <ContractGlyph /> : <PopoutGlyph />}
        </button>
      </div>
      <div className="docs-chat-log" ref={listRef}>
        {!ready ? <RetrievingBubble label="Loading chat ..." /> : null}
        {ready && messages.length === 0 && !waitingOnSummary ? (
          <p className="docs-chat-empty">
            Answers are generated from the content of these documentation pages using Gemini and Elasticsearch.
          </p>
        ) : null}
        {ready
          ? messages.map((message, index) => {
              const text = messageText(message);
              const showSummaryHint =
                message.role === "assistant" &&
                index === messages.length - 1 &&
                waitingOnSummary &&
                /^## Summary/m.test(text) &&
                !summaryBody(text);
              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "docs-chat-bubble docs-chat-bubble-user"
                      : "docs-chat-bubble docs-chat-bubble-assistant"
                  }
                >
                  <ChatMarkdown text={text} />
                  {showSummaryHint ? (
                    <p
                      className="docs-chat-retrieving"
                      role="status"
                      aria-live="polite"
                    >
                      Retrieving responses ...
                    </p>
                  ) : null}
                </div>
              );
            })
          : null}
        {retrievingBanner ? <RetrievingBubble /> : null}
        {error ? (
          <p className="docs-chat-error">{formatChatQuotaError(error.message)}</p>
        ) : null}
      </div>
      <form className="docs-chat-form" onSubmit={onSubmit}>
        <label className="docs-chat-label" htmlFor="docs-chat-input">
          Ask a Question
        </label>
        <textarea
          id="docs-chat-input"
          className="docs-chat-input"
          rows={3}
          placeholder="Ask a question about the documentation ..."
          value={input}
          disabled={busy || clearing}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="docs-chat-actions">
          {hasAnswers ? (
            <button
              type="button"
              className="docs-chat-clear"
              disabled={busy || clearing}
              onClick={onClearChat}
            >
              Clear Chat
            </button>
          ) : null}
          <button
            type="submit"
            className="docs-chat-send"
            disabled={busy || clearing || !input.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {!maximized ? panel : null}
      {mounted && maximized
        ? createPortal(
            <div className="docs-chat-overlay" role="presentation">
              <button
                type="button"
                className="docs-chat-backdrop"
                aria-label="Restore chat"
                onClick={() => setMaximized(false)}
              />
              {panel}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
