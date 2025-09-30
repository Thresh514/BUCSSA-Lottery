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

export interface GameState {
  status: "waiting" | "playing" | "ended";
  round: number;
  currentQuestion: MinorityQuestion | null;
  answers: { A: number; B: number } | null;
  survivorsCount: number;
  eliminatedCount: number;
  userAnswer: 'A' | 'B' | null;
  timeLeft: number;
}

// 轮次结果消息
export interface RoundResult {
  minorityAnswer: 'A' | 'B';
  majorityAnswer: 'A' | 'B';
  answers: { A: number; B: number };
}

// not used at the moment
export interface hasWinner {
  winnerEmail: string | null;
}

// not used at the moment
export interface hasTie {
  finalists: string[] | null;
}

// not used at the moment
export interface Eliminated {
  userId: string;
}

// 游戏结束消息
export interface GameEnded {
  winnerEmail: string | null;
  finalists: string[] | null;
}

// JWT Payload
// deprecated
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
} 