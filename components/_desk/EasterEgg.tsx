const EASTER_EGG = {
  heading: "Macte virtute!",
  paragraphs: [
    "You found the silly little Easter egg, with a retro twist.",
    "I am a human that hates talking about myself, which you wouldn’t believe if you managed to corner me into an interview.",
    "The best I can do is some original poetry, some of which may or may not be autobiographical.",
    "Turn the page to receive a slightly-randomized one, y’know, in honour of the ephemeral.",
    "No, I will not be taking any constructive criticism, thank you very kindly — but please do <3 the poems you like and leave a comment in the guestbook."
  ],
  signoff: {
    mark: "svv,",
  },
};

export function EasterEgg() {
  return (
    <div className="leaf-copy">
      <p className="easter-heading">{EASTER_EGG.heading}</p>
      {EASTER_EGG.paragraphs.map((paragraph) => (
        <p key={paragraph} className="easter-body">
          {paragraph}
        </p>
      ))}
      <p className="easter-signoff">
        <span className="easter-signoff-mark">{EASTER_EGG.signoff.mark}</span>
        <span className="easter-signoff-name">
          {/* Hello Honey k.1 (\uE011) is the ending heart flourish */}
          B<span className="easter-signoff-heart">ec{"\uE011"}</span>
        </span>
      </p>
      <a
        className="portfolio-link"
        href="https://beck-chan.github.io/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit Beck&apos;s Portfolio
      </a>
    </div>
  );
}
