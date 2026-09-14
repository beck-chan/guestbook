"use client";

export function AdminPageFrame({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <main className={`${className} guestbook-themed page-enter`}>{children}</main>
  );
}
