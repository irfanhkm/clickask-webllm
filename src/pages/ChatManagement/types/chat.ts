export interface ChatRoom {
  id: string;
  name: string;
  modelId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  createdAt: number;
  lastUpdated: number;
} 