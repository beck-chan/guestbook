type MockNote = {
  name: string;
  body: string;
  nested?: boolean;
};

const MOCK_NOTES: MockNote[] = [
  {
    name: "a guest",
    body: "this one stopped me in the doorway.",
  },
  {
    name: "m.",
    body: "turning the page felt like exhaling.",
    nested: true,
  },
  {
    name: "anon",
    body: "i keep coming back to the last line.",
  },
  {
    name: "june",
    body: "left it open on the kitchen table. the peonies did the rest.",
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
          <label className="comment-name" htmlFor="comment-input">
            enter your display name
          </label>
          <textarea
            id="comment-input"
            className="comment-input"
            name="comment"
            rows={4}
            placeholder="Sign the guestbook! Yes, just like it's 2001. No contact info, no editing, no deleting, just thoughts into the void. (Please be kind.)"
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
            <figcaption className="comment-name">{note.name}</figcaption>
            <p className="comment-body">{note.body}</p>
          </figure>
        ))}
      </div>
      <nav className="comment-pages" aria-label="Guestbook pages">
        <span className="comment-page is-disabled">prev</span>
        <span className="comment-page is-current" aria-current="page">
          1
        </span>
        <button type="button" className="comment-page">
          2
        </button>
        <button type="button" className="comment-page">
          3
        </button>
        <button type="button" className="comment-page">
          next
        </button>
      </nav>
    </aside>
  );
}
