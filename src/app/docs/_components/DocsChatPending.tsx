import { ChatStatusText } from "./ChatStatusText";

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
        <div className="docs-chat-bubble docs-chat-bubble-assistant">
          <p className="docs-chat-retrieving" aria-label="Loading chat">
            <ChatStatusText text="Loading chat" />
          </p>
        </div>
      </div>
    </div>
  );
}
