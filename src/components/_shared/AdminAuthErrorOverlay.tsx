"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminAuthErrorOverlay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = searchParams.get("admin_error") === "1";

  function dismiss() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("admin_error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="admin-auth-error-overlay"
      role="presentation"
      onClick={dismiss}
    >
      <div
        className="admin-auth-error-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-auth-error-title"
        aria-describedby="admin-auth-error-body"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-auth-error-title" className="admin-auth-error-title">
          Oops.
        </h2>
        <p id="admin-auth-error-body" className="admin-auth-error-body">
          The Google account you used to sign in isn&apos;t an administrator.
        </p>
        <button type="button" className="admin-auth-error-ok" onClick={dismiss}>
          Boo hiss! Fine.
        </button>
      </div>
    </div>
  );
}
