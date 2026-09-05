"use client";

import { MOCK_COMMENTS } from "@/lib/comments";
import { HitCounter } from "@/components/HitCounter";
import {
  guestbookCommentPlaceholder,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

type CommentBubblesProps = {
  showHits?: boolean;
  idPrefix?: string;
  sectionId?: string;
  limit?: number;
};

export function CommentBubbles({
  showHits = true,
  idPrefix = "",
  sectionId,
  limit = 4,
}: CommentBubblesProps) {
  const [{ captureEmail, placeholder }] = useGuestbookSettings();
  const nameId = `${idPrefix}comment-name`;
  const inputId = `${idPrefix}comment-input`;

  return (
    <aside className="desk-side" id={sectionId}>
      {showHits ? <HitCounter /> : null}
      <form
        className="comment-compose"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="comment-bubble is-compose">
          <input
            id={nameId}
            className="comment-name-input"
            name="name"
            type="text"
            placeholder="enter your display name"
            autoComplete="nickname"
            aria-label="display name"
          />
          {captureEmail ? (
            <input
              type="email"
              className="comment-email"
              name="email"
              placeholder="email (optional, only visible to admin)"
              autoComplete="email"
            />
          ) : null}
          <textarea
            id={inputId}
            className="comment-input"
            name="comment"
            rows={4}
            placeholder={guestbookCommentPlaceholder(placeholder)}
          />
        </div>
        <button type="submit" className="comment-action">
          submit
        </button>
      </form>
      <div className="comment-thread">
        {MOCK_COMMENTS.slice(0, limit).map((note) => (
          <figure
            key={note.id}
            className={`comment-bubble${note.nested ? " is-nested" : ""}`}
          >
            <figcaption className="comment-meta">
              <span className="comment-name">{note.name}</span>
              <time className="comment-time">{note.time}</time>
            </figcaption>
            <p className="comment-body">{note.body}</p>
          </figure>
        ))}
      </div>
      <nav className="comment-pages" aria-label="Guestbook pages">
        <button type="button" className="comment-page">
          prev
        </button>
        <button type="button" className="comment-page">
          1
        </button>
        <span className="comment-page is-ellipsis" aria-hidden="true">
          …
        </span>
        <span className="comment-page is-current" aria-current="page">
          4
        </span>
        <span className="comment-page is-ellipsis" aria-hidden="true">
          …
        </span>
        <button type="button" className="comment-page">
          12
        </button>
        <button type="button" className="comment-page">
          next
        </button>
      </nav>
    </aside>
  );
}
