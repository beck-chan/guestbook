import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="admin-page admin-desk">
      <div className="admin-shell" style={{ padding: "2rem" }}>
        <h1 className="admin-title">forbidden</h1>
        <p className="admin-lede">
          You are signed in, but this account is not an admin.
        </p>
        <p>
          <Link className="admin-comment-link" href="/">
            return home
          </Link>
        </p>
      </div>
    </main>
  );
}
