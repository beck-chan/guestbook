"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteComment, updateComment } from "@/app/actions/comments";
import { MarkReadCheckbox } from "@/components/_admin/MarkReadCheckbox";
import type { GuestbookComment } from "@/lib/comments";

type CommentMode = { kind: "edit" | "delete"; id: string } | null;

type EditDraft = {
  name: string;
  email: string;
  body: string;
};

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
  const [draft, setDraft] = useState<EditDraft>({
    name: "",
    email: "",
    body: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const editingId = mode?.kind === "edit" ? mode.id : null;

  useEffect(() => {
    setNotes(comments);
    setReadById(
      Object.fromEntries(comments.map((note) => [note.id, Boolean(note.read)])),
    );
  }, [comments]);

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
    setError(null);
    setMode({ kind: "edit", id: note.id });
    setDraft({
      name: note.name,
      email: note.email ?? "",
      body: note.body,
    });
  }

  function saveEdit() {
    if (mode?.kind !== "edit") {
      return;
    }
    const id = mode.id;
    const name = draft.name.trim();
    const body = draft.body.trim();
    const email = draft.email.trim();
    if (!name || !body) {
      setError("Display name and comment are required.");
      return;
    }

    startTransition(async () => {
      const result = await updateComment({ id, name, email, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotes((current) =>
        current.map((note) =>
          note.id === id
            ? {
                ...note,
                name,
                email: email || undefined,
                body,
              }
            : note,
        ),
      );
      setMode(null);
      setError(null);
    });
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      const result = await deleteComment(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotes((current) => current.filter((note) => note.id !== id));
      setReadById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMode(null);
      setError(null);
    });
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
      {error ? (
        <p className="comment-error" role="alert">
          {error}
        </p>
      ) : null}
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
          <article key={note.id} className="admin-comment">
            <figure
              className={`comment-bubble${editing ? " is-editing" : ""}`}
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
              {editing ? (
                <>
                  <input
                    className="comment-name-input"
                    name={`edit-name-${note.id}`}
                    type="text"
                    aria-label={`edit ${note.name} display name`}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    disabled={pending}
                  />
                  <input
                    className="comment-email"
                    name={`edit-email-${note.id}`}
                    type="email"
                    aria-label={`edit ${note.name} email`}
                    placeholder="email (optional)"
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    disabled={pending}
                  />
                  <textarea
                    ref={editorRef}
                    className="comment-input"
                    name={`edit-${note.id}`}
                    rows={4}
                    aria-label={`edit ${note.name} comment`}
                    value={draft.body}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setMode(null);
                      }
                    }}
                    disabled={pending}
                  />
                </>
              ) : (
                <>
                  <figcaption className="comment-meta">
                    <span className="comment-name">{note.name}</span>
                    <time className="comment-time" dateTime={note.createdAt}>
                      {note.time}
                    </time>
                  </figcaption>
                  {note.email ? (
                    <p className="admin-comment-email">{note.email}</p>
                  ) : (
                    <p className="admin-comment-email is-missing">no email</p>
                  )}
                  <p className="comment-body">{note.body}</p>
                </>
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
                    disabled={pending}
                    onClick={() => setMode(null)}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    className="admin-comment-link"
                    disabled={pending}
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
                    disabled={pending}
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
                    disabled={editing || pending}
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
