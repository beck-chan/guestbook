"use client";

import { useEffect, useRef, useState } from "react";
import { MarkReadCheckbox } from "@/components/_admin/MarkReadCheckbox";
import type { GuestbookComment } from "@/lib/comments";

type CommentMode = { kind: "edit" | "delete"; id: string } | null;

export function AdminCommentThread({
  comments,
}: {
  comments: GuestbookComment[];
}) {
  const [notes, setNotes] = useState(comments);
  const [readById, setReadById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(comments.map((note) => [note.id, Boolean(note.read)])),
  );
  const [mode, setMode] = useState<CommentMode>(null);
  const [draft, setDraft] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const editingId = mode?.kind === "edit" ? mode.id : null;

  useEffect(() => {
    if (editingId) {
      editorRef.current?.focus();
      const node = editorRef.current;
      if (node) {
        node.setSelectionRange(node.value.length, node.value.length);
      }
    }
  }, [editingId]);

  function setAll(read: boolean) {
    setReadById(Object.fromEntries(notes.map((note) => [note.id, read])));
  }

  function startEdit(note: GuestbookComment) {
    setMode({ kind: "edit", id: note.id });
    setDraft(note.body);
  }

  function saveEdit() {
    if (mode?.kind !== "edit") {
      return;
    }
    const id = mode.id;
    const next = draft.trim();
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, body: next || note.body } : note,
      ),
    );
    setMode(null);
  }

  function confirmDelete(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id));
    setReadById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setMode(null);
  }

  if (notes.length === 0) {
    return (
      <div className="comment-thread">
        <p className="admin-empty">no comments match.</p>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      <nav className="admin-bulk-actions" aria-label="Mark all comments">
        <button
          type="button"
          className="admin-comment-link"
          onClick={() => setAll(false)}
        >
          mark all unread
        </button>
        <button
          type="button"
          className="admin-comment-link"
          onClick={() => setAll(true)}
        >
          mark all read
        </button>
      </nav>
      {notes.map((note) => {
        const editing = mode?.kind === "edit" && mode.id === note.id;
        const confirming = mode?.kind === "delete" && mode.id === note.id;

        return (
          <article
            key={note.id}
            className={`admin-comment${note.nested ? " is-nested" : ""}`}
          >
            <figure
              className={`comment-bubble${note.nested ? " is-nested" : ""}${
                editing ? " is-editing" : ""
              }`}
              onBlur={(event) => {
                const next = event.relatedTarget;
                if (
                  editing &&
                  !(next instanceof Node && event.currentTarget.contains(next))
                ) {
                  saveEdit();
                }
              }}
            >
              <figcaption className="comment-meta">
                <span className="comment-name">{note.name}</span>
                <time className="comment-time">{note.time}</time>
              </figcaption>
              {note.email ? (
                <p className="admin-comment-email">{note.email}</p>
              ) : (
                <p className="admin-comment-email is-missing">no email</p>
              )}
              {editing ? (
                <textarea
                  ref={editorRef}
                  className="comment-input"
                  name={`edit-${note.id}`}
                  rows={4}
                  aria-label={`edit ${note.name} comment`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setMode(null);
                    }
                  }}
                />
              ) : (
                <p className="comment-body">{note.body}</p>
              )}
              <MarkReadCheckbox
                commentId={note.id}
                read={Boolean(readById[note.id])}
                onReadChange={(read) =>
                  setReadById((current) => ({ ...current, [note.id]: read }))
                }
              />
            </figure>
            <nav
              className="admin-comment-actions"
              aria-label={`${note.name} comment actions`}
            >
              {confirming ? (
                <>
                  <button
                    type="button"
                    className="admin-comment-link"
                    onClick={() => setMode(null)}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    className="admin-comment-link"
                    onClick={() => confirmDelete(note.id)}
                  >
                    confirm
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-comment-link"
                    onClick={() => {
                      if (editing) {
                        saveEdit();
                      }
                      setMode({ kind: "delete", id: note.id });
                    }}
                  >
                    delete
                  </button>
                  <button
                    type="button"
                    className="admin-comment-link"
                    disabled={editing}
                    onClick={() => startEdit(note)}
                  >
                    edit
                  </button>
                </>
              )}
            </nav>
          </article>
        );
      })}
    </div>
  );
}
