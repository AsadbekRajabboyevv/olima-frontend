export interface ChatRequest {
  organizationId: string;
  conversationId?: string;
  message: string;
}

export interface ToolCallInfo {
  toolName: string;
  input: string;
  output: string;
  status: string;
  durationMs: number;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  toolCalls: ToolCallInfo[];
  sources: string[];
  confirmationRequired: boolean;
  pendingComplaintId?: string;
  conversationToken?: string | null;
}

export interface ChatStreamEvent {
  type: 'INIT' | 'TOOL_CALL' | 'CONTENT' | 'COMPLETE' | 'ERROR';
  content?: string;
  toolCall?: ToolCallInfo;
  sources?: string[];
  conversationId?: string;
  confirmationRequired?: boolean;
  pendingComplaintId?: string;
  conversationToken?: string | null;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'TOOL' | 'SYSTEM';
  content: string;
  toolCallId?: string;
  toolName?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  title: string;
  messages?: Message[];
  messageCount?: number;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface MapLocation {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
}

export interface DisplayMessage {
  role: 'USER' | 'ASSISTANT' | 'TOOL_INFO';
  content?: string;
  toolCalls?: ToolCallInfo[];
  sources?: string[];
  confirmationRequired?: boolean;
  pendingComplaintId?: string;
  isStreaming?: boolean;
}
