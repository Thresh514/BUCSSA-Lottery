// 用户相关类型
export interface User {
  id: string;
  email: string;
  isAlive: boolean;
  joinedAt: string;
}

// 题目相关类型
export interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: string;
}

// 游戏状态类型
export interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  currentQuestionId: string | null;
  round: number;
  timeLeft: number;
  totalPlayers: number;
  survivorsCount: number;
  eliminatedCount: number;
}

// WebSocket 消息类型
export interface SocketMessage {
  type: 'new_question' | 'round_result' | 'eliminated' | 'game_ended' | 'game_state';
  data: any;
}

// 新题目消息
export interface NewQuestionMessage {
  question: Question;
  round: number;
  timeLeft: number;
  survivorsCount: number;
}

// 轮次结果消息
export interface RoundResultMessage {
  correctAnswer: string;
  eliminatedCount: number;
  survivorsCount: number;
  eliminatedUsers: string[];
}

// 答题提交
export interface AnswerSubmission {
  userId: string;
  questionId: string;
  selectedOption: string;
  submittedAt: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
} 