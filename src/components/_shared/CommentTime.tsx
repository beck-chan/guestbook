type CommentTimeProps = {
  createdAt?: string;
  fallback: string;
};

/** Preformatted in the visitor timezone by the server (`note.time`). */
export function CommentTime({ createdAt, fallback }: CommentTimeProps) {
  return (
    <time className="comment-time" dateTime={createdAt}>
      {fallback}
    </time>
  );
}
