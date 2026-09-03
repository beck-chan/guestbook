"use client";

import { useState } from "react";
import { MarkReadCheckbox } from "@/components/MarkReadCheckbox";
import type { GuestbookComment } from "@/lib/comments";

export function AdminCommentThread({
  comments,
}: {
  comments: GuestbookComment[];
}) {
  const [readById, setReadById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(comments.map((note) => [note.id, Boolean(note.read)])),
  );

  function setAll(read: boolean) {
    setReadById(Object.fromEntries(comments.map((note) => [note.id, read])));
  }

  if (comments.length === 0) {
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
      {comments.map((note) => (
        <article
          key={note.id}
          className={`admin-comment${note.nested ? " is-nested" : ""}`}
        >
          <figure
            className={`comment-bubble${note.nested ? " is-nested" : ""}`}
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
            <p className="comment-body">{note.body}</p>
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
            <a className="admin-comment-link" href={`#delete-${note.id}`}>
              delete
            </a>
            <a className="admin-comment-link" href={`#edit-${note.id}`}>
              edit
            </a>
          </nav>
        </article>
      ))}
    </div>
  );
}
