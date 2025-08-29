// 用户相关类型
// not used at the moment
export interface User {
  id: string;
  email: string;
  isAlive: boolean;
  joinedAt: string;
}

// WebSocket 消息类型
// not used at the moment
export interface SocketMessage {
  type: 'new_question' | 'round_result' | 'eliminated' | 'game_ended' | 'game_state' | 'countdown';
  data: any;
}

// 少数派游戏题目类型
export interface MinorityQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  startTime: string;
}

// 新题目消息
export interface NewQuestion {
  question: MinorityQuestion;
  round: number;
  timeLeft: number;
  survivorsCount: number;
}

export interface GameState {
  status: "waiting" | "playing" | "ended";
  currentQuestion: MinorityQuestion | null;
  round: number;
  timeLeft: number;
  survivorsCount: number;
  eliminatedCount: number;
}

// 轮次结果消息
export interface RoundResult {
  minorityAnswer: 'A' | 'B';
  majorityAnswer: 'A' | 'B';
  answers: { A: number; B: number };
  survivorsCount: number;
  eliminatedCount: number;
}

// 答题提交
export interface AnswerSubmission {
  userEmail: string;
  answer: 'A' | 'B';
}

// 轮次统计
export interface RoundStats {
  question: MinorityQuestion;
  answers: { A: number; B: number };
  totalAnswers: number;
  survivorsCount: number;
}

export interface GameStats {
  totalPlayers: number;
  survivorsCount: number;
  eliminatedCount: number;
  currentRound: number;
  status: string;
  timeLeft: number;
  roundStats?: RoundStats;
}

// 游戏结束消息
export interface GameEnded {
  winner: string | null;
}

// JWT Payload
// deprecated
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
} 