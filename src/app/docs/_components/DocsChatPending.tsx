export function DocsChatPending({ maximized = false }: { maximized?: boolean }) {
  return (
    <div
      className={
        maximized ? "docs-chat-panel docs-chat-panel-max" : "docs-chat-panel"
      }
      role="status"
      aria-live="polite"
      aria-label="Docs chat"
    >
      <div className="docs-chat-head">
        <p className="docs-chat-title">Ask the Documentation</p>
      </div>
      <div className="docs-chat-log">
        <p className="docs-chat-empty">Retrieving responses ...</p>
      </div>
    </div>
  );
}
