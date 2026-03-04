export interface WorkerAiChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

export  interface WorkerAiResponse {
  result: {
    choices: WorkerAiChoice[];
  };
  success: boolean;
  errors: unknown[];
}

export interface WorkerAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WorkerAiRequest {
  messages: WorkerAiMessage[];
}