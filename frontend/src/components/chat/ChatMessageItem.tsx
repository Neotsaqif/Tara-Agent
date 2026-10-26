import { AiBubble } from "./AiBubble";
import type { ChatMessage } from "./types";
import { UserBubble } from "./UserBubble";

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case "user":
      return <UserBubble message={message} />;
    case "ai_text":
      return <AiBubble message={message} />;
    case "selection":
      // Handled separately by SelectionBubble component
      return null;
    default:
      return null;
  }
}
