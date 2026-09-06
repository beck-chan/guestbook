"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminAuthErrorOverlay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("admin_error") === "1") {
      setOpen(true);
    }
  }, [searchParams]);

  function dismiss() {
    setOpen(false);
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
          Access denied
        </h2>
        <p id="admin-auth-error-body" className="admin-auth-error-body">
          That Google account isn&apos;t on the admin allowlist, so it can&apos;t
          sign in to moderate this guestbook.
        </p>
        <button type="button" className="admin-auth-error-ok" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>
  );
}
