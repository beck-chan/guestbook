"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";

function messageText(message: UIMessage) {
  return (message.parts ?? [])
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function splitCitations(text: string) {
  const match = text.match(/\n\n((?:- \[[^\]]+\]\([^)]+\)\n?)+)\s*$/);
  if (!match) {
    return { body: text, links: [] as { href: string; label: string }[] };
  }
  const links: { href: string; label: string }[] = [];
  const re = /- \[([^\]]+)\]\(([^)]+)\)/g;
  let found: RegExpExecArray | null;
  while ((found = re.exec(match[1]))) {
    links.push({ label: found[1], href: found[2] });
  }
  return { body: text.slice(0, match.index).trim(), links };
}

export function DocsChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/docs/chat" }),
    [],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

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
  }, [messages, open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="docs-chat">
      {open ? (
        <div className="docs-chat-panel" role="dialog" aria-label="Docs chat">
          <div className="docs-chat-head">
            <p className="docs-chat-title">Ask the Documentation</p>
            <button
              type="button"
              className="docs-chat-close"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="docs-chat-log" ref={listRef}>
            {messages.length === 0 ? (
              <p className="docs-chat-empty">
                Questions are answered from these documentation pages.
              </p>
            ) : null}
            {messages.map((message) => {
              const { body, links } = splitCitations(messageText(message));
              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "docs-chat-bubble docs-chat-bubble-user"
                      : "docs-chat-bubble docs-chat-bubble-assistant"
                  }
                >
                  <p>{body}</p>
                  {links.length > 0 ? (
                    <ul className="docs-chat-sources">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
            {error ? <p className="docs-chat-error">{error.message}</p> : null}
          </div>
          <form className="docs-chat-form" onSubmit={onSubmit}>
            <label className="docs-chat-label" htmlFor="docs-chat-input">
              Ask a Question
            </label>
            <textarea
              id="docs-chat-input"
              className="docs-chat-input"
              rows={3}
              placeholder="Ask Anything!"
              value={input}
              disabled={!ready || status === "streaming" || status === "submitted"}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="docs-chat-send"
              disabled={
                !ready ||
                !input.trim() ||
                status === "streaming" ||
                status === "submitted"
              }
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        className="docs-chat-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide Chat" : "Ask a Question"}
      </button>
    </div>
  );
}
