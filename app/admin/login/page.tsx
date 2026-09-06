import type { Metadata } from "next";
import { signInWithGoogle } from "@/app/actions/auth";
import { AdminPageFrame } from "@/components/_admin/AdminPageFrame";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to moderate the guestbook.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const error = first(params.error);

  return (
    <AdminPageFrame className="admin-page admin-desk">
      <a className="admin-book-tab" href="/" aria-label="return to book">
        <span className="admin-book-tab-ribbon" aria-hidden="true">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M1.5,40 V9.5 Q1.5,1.5 9.5,1.5 H90.5 Q98.5,1.5 98.5,9.5 V40 Z" />
          </svg>
        </span>
        <span className="admin-book-tab-label">return</span>
      </a>
      <div className="desk-split">
        <section className="admin-main" aria-label="Admin login">
          <DeskBookmarks />
          <div className="admin-shell">
            <h1 className="admin-title">admin login</h1>
            <p className="admin-lede">
              Sign in with Google to moderate comments and settings.
            </p>
            {error ? (
              <p className="comment-error" role="alert">
                Could not sign in. Try again, or ask for allowlist access.
              </p>
            ) : null}
            <form action={signInWithGoogle}>
              <button type="submit" className="admin-comment-link">
                Sign in with Google
              </button>
            </form>
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}
