import { docsUrl, flags, getStartedUrl } from "@/lib/flags";

function AdminRibbon() {
  return (
    <span className="desk-bookmark-ribbon" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="98.5,0 98.5,98.5 50,77 1.5,98.5 1.5,0" />
      </svg>
    </span>
  );
}

type DeskBookmarksProps = {
  publicMode?: boolean;
};

export function DeskBookmarks({ publicMode = false }: DeskBookmarksProps) {
  if (publicMode) {
    if (!flags.docs) {
      return null;
    }

    return (
      <div className="desk-bookmarks">
        <a
          className="desk-bookmark desk-bookmark-labeled"
          href={getStartedUrl}
          aria-label="get started"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="desk-bookmark-ribbon" aria-hidden="true" />
          <span className="desk-bookmark-label">
            get
            <br />
            started
          </span>
        </a>
        <a
          className="desk-bookmark desk-bookmark-short desk-bookmark-admin desk-bookmark-visible"
          href={docsUrl}
          aria-label="view docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <AdminRibbon />
          <span className="desk-bookmark-label">view docs</span>
        </a>
      </div>
    );
  }

  if (flags.docs) {
    return (
      <div className="desk-bookmarks">
        <a
          className="desk-bookmark desk-bookmark-labeled"
          href={docsUrl}
          aria-label="view docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="desk-bookmark-ribbon" aria-hidden="true" />
          <span className="desk-bookmark-label">
            view
            <br />
            docs
          </span>
        </a>
        <a
          className="desk-bookmark desk-bookmark-short desk-bookmark-admin"
          href="/admin/login"
          aria-label="admin login"
        >
          <AdminRibbon />
          <span className="desk-bookmark-label">admin login</span>
        </a>
      </div>
    );
  }

  return (
    <div className="desk-bookmarks">
      <a
        className="desk-bookmark desk-bookmark-labeled"
        href="/admin/login"
        aria-label="admin login"
      >
        <span className="desk-bookmark-ribbon" aria-hidden="true" />
        <span className="desk-bookmark-label">
          admin
          <br />
          login
        </span>
      </a>
    </div>
  );
}
