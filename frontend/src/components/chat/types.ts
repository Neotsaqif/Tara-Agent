export type RecommendationOption = {
  id: "A" | "B" | "C";
  title: string;
  description: string;
  impact: string;
  risk: string;
  margin: string;
  rationale: string;
  revenue?: string;
  additional?: string;
  confidence?: string;
  feasible?: boolean;
  unfeasibleReason?: string;
};

export type UserMessage = {
  type: "user";
  id: string;
  content: string;
  timestamp?: string;
  isDraft?: boolean;
};

export type AiTextMessage = {
  type: "ai_text";
  id: string;
  content: string;
  label?: string;
  timestamp?: string;
  status?: "ready" | "loading" | "error";
  errorMessage?: string;
};

export type SelectionMessage = {
  type: "selection";
  id: string;
  title?: string;
  options: RecommendationOption[];
  selectedOptionId?: string | null;
  rationaleTitle?: string;
  rationale?: string;
  timestamp?: string;
};

export type ChatMessage = UserMessage | AiTextMessage | SelectionMessage;
