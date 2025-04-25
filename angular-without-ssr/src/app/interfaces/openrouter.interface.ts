export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface OpenRouterRequestPayload {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  response_format?: {
    type: string;
    json_schema?: {
      name: string;
      strict: boolean;
      schema: {
        type: string;
        properties: {
          [key: string]: any;
        }
      }
    }
  };
  temperature?: number;
  max_tokens?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterRequestPayload {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: string;
    json_schema?: {
      name: string;
      strict: boolean;
      schema: {
        type: string;
        properties: {
          [key: string]: any;
        };
      };
    };
  };
}

export interface OpenRouterRequestPayload {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: string;
    json_schema?: {
      name: string;
      strict: boolean;
      schema: {
        type: string;
        properties: {
          [key: string]: any;
        };
      };
    };
  };
}
