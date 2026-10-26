import type { UserMessage } from "./types";

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div
      className="user-message"
      data-testid="user-bubble"
      role="article"
      aria-label={message.isDraft ? "Draft pesan pengguna" : "Pesan pengguna"}
    >
      {message.isDraft ? `Draft lokal: ${message.content}` : message.content}
    </div>
  );
}
