"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPublicCommentsPage,
  submitComment,
} from "@/app/actions/comments";
import { HitCounter } from "@/components/_shared/HitCounter";
import {
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
  /**
   * Page size for this board. When set (e.g. desk = 4), settings page_size is ignored.
   * When omitted, uses guestbook_settings.page_size.
   */
  limit?: number;
  initialComments?: GuestbookComment[];
  initialPage?: number;
  initialTotalPages?: number;
};

export function CommentBubbles({
  showHits = true,
  idPrefix = "",
  sectionId,
  limit,
  initialComments,
  initialPage = 1,
  initialTotalPages = 1,
}: CommentBubblesProps) {
  const [{ captureEmail, placeholder, pageSize }] = useGuestbookSettings();
  const nameId = `${idPrefix}comment-name`;
  const inputId = `${idPrefix}comment-input`;
  const pageSizeOverride =
    typeof limit === "number" && limit > 0 ? limit : undefined;

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
      const result = await getPublicCommentsPage(1, pageSizeOverride);
      setComments(result.comments);
      setPage(result.page);
      setTotalPages(result.totalPages);
    });
  }, [initialComments, pageSizeOverride, pageSize]);

  function loadPage(nextPage: number) {
    startTransition(async () => {
      const result = await getPublicCommentsPage(nextPage, pageSizeOverride);
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
      const refreshed = await getPublicCommentsPage(1, pageSizeOverride);
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
        <span className="comment-page is-status" aria-current="page">
          <span className="comment-page-current">{page}</span>
          {" / "}
          {totalPages}
        </span>
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
