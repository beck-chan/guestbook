type MockNote = {
  name: string;
  body: string;
  time: string;
  nested?: boolean;
};

const MOCK_NOTES: MockNote[] = [
  {
    name: "a guest",
    body: "this one stopped me in the doorway.",
    time: "just now",
  },
  {
    name: "m.",
    body: "turning the page felt like exhaling.",
    time: "2h ago",
    nested: true,
  },
  {
    name: "anon",
    body: "i keep coming back to the last line.",
    time: "yesterday",
  },
  {
    name: "june",
    body: "left it open on the kitchen table. the peonies did the rest.",
    time: "Aug 28",
    nested: true,
  },
];

export function CommentBubbles() {
  return (
    <aside className="desk-side">
      <div className="hit-counter" aria-hidden="true">
        <p className="hit-counter-digits">
          {"000481".split("").map((digit, index) => (
            <span key={`${digit}-${index}`}>{digit}</span>
          ))}
        </p>
        <p className="hit-counter-label">hits</p>
      </div>
      <form
        className="comment-compose"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="comment-bubble is-compose">
          <input
            id="comment-name"
            className="comment-name-input"
            name="name"
            type="text"
            placeholder="enter your display name"
            autoComplete="nickname"
            aria-label="display name"
          />
          <input
            type="email"
            className="comment-email"
            name="email"
            placeholder="email (optional, only visible to admin)"
            autoComplete="email"
          />
          <textarea
            id="comment-input"
            className="comment-input"
            name="comment"
            rows={4}
            placeholder={"Sign the guestbook! Yes, just like it's 2001.\nNo editing, no deleting, just thoughts into the void.\n\n(Please be kind.)"}
          />
        </div>
        <button type="submit" className="comment-action">
          submit
        </button>
      </form>
      <div className="comment-thread">
        {MOCK_NOTES.map((note) => (
          <figure
            key={`${note.name}-${note.body}`}
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
