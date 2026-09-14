export function AdminPageFrame({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return <main className={`${className} guestbook-themed`}>{children}</main>;
}
