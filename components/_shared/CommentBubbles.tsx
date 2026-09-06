"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPublicCommentsPage,
  submitComment,
} from "@/app/actions/comments";
import { HitCounter } from "@/components/_shared/HitCounter";
import {
  publicPageItems,
  type GuestbookComment,
} from "@/lib/comments";
import {
  guestbookCommentPlaceholder,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

type CommentBubblesProps = {
  showHits?: boolean;
  idPrefix?: string;
  sectionId?: string;
  /** Kept for call-site compatibility; page size comes from guestbook_settings. */
  limit?: number;
  initialComments?: GuestbookComment[];
  initialPage?: number;
  initialTotalPages?: number;
};

export function CommentBubbles({
  showHits = true,
  idPrefix = "",
  sectionId,
  limit: _limit,
  initialComments,
  initialPage = 1,
  initialTotalPages = 1,
}: CommentBubblesProps) {
  const [{ captureEmail, placeholder }] = useGuestbookSettings();
  const nameId = `${idPrefix}comment-name`;
  const inputId = `${idPrefix}comment-input`;

  const [comments, setComments] = useState<GuestbookComment[]>(
    initialComments ?? [],
  );
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialComments) {
      return;
    }
    startTransition(async () => {
      const result = await getPublicCommentsPage(1);
      setComments(result.comments);
      setPage(result.page);
      setTotalPages(result.totalPages);
    });
  }, [initialComments]);

  function loadPage(nextPage: number) {
    startTransition(async () => {
      const result = await getPublicCommentsPage(nextPage);
      setComments(result.comments);
      setPage(result.page);
      setTotalPages(result.totalPages);
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitComment({
        name,
        email: captureEmail ? email : undefined,
        comment: body,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setEmail("");
      setBody("");
      const refreshed = await getPublicCommentsPage(1);
      setComments(refreshed.comments);
      setPage(refreshed.page);
      setTotalPages(refreshed.totalPages);
    });
  }

  return (
    <aside className="desk-side" id={sectionId}>
      {showHits ? <HitCounter /> : null}
      <form className="comment-compose" onSubmit={onSubmit}>
        <div className="comment-bubble is-compose">
          <input
            id={nameId}
            className="comment-name-input"
            name="name"
            type="text"
            placeholder="enter your display name"
            autoComplete="nickname"
            aria-label="display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {captureEmail ? (
            <input
              type="email"
              className="comment-email"
              name="email"
              placeholder="email (optional, only visible to admin)"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          ) : null}
          <textarea
            id={inputId}
            className="comment-input"
            name="comment"
            rows={4}
            placeholder={guestbookCommentPlaceholder(placeholder)}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="comment-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="comment-action" disabled={pending}>
          submit
        </button>
      </form>
      <div className="comment-thread">
        {comments.map((note) => (
          <figure key={note.id} className="comment-bubble">
            <figcaption className="comment-meta">
              <span className="comment-name">{note.name}</span>
              <time className="comment-time" dateTime={note.createdAt}>
                {note.time}
              </time>
            </figcaption>
            <p className="comment-body">{note.body}</p>
          </figure>
        ))}
      </div>
      <nav className="comment-pages" aria-label="Guestbook pages">
        {page > 1 ? (
          <button
            type="button"
            className="comment-page"
            disabled={pending}
            onClick={() => loadPage(page - 1)}
          >
            prev
          </button>
        ) : (
          <span className="comment-page is-disabled">prev</span>
        )}
        {publicPageItems(page, totalPages).map((item, index) =>
          item.type === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="comment-page is-ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          ) : item.n === page ? (
            <span
              key={item.n}
              className="comment-page is-current"
              aria-current="page"
            >
              {item.n}
            </span>
          ) : (
            <button
              key={item.n}
              type="button"
              className="comment-page"
              disabled={pending}
              onClick={() => loadPage(item.n)}
            >
              {item.n}
            </button>
          ),
        )}
        {page < totalPages ? (
          <button
            type="button"
            className="comment-page"
            disabled={pending}
            onClick={() => loadPage(page + 1)}
          >
            next
          </button>
        ) : (
          <span className="comment-page is-disabled">next</span>
        )}
      </nav>
    </aside>
  );
}
