// JWT
export interface JWTPayload {
  email: string;
  id: string;
  isAdmin?: boolean;
  isDisplay?: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

// 少数派题目（与 game 中 Redis 存储结构一致）
export interface MinorityQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  startTime: string;
}

// 房间状态（getRoomState 返回值，admin/display 用）
export interface RoomState {
  status: 'waiting' | 'playing' | 'ended';
  currentQuestion: MinorityQuestion | null;
  round: number;
  answers: { A: number; B: number } | null;
  timeLeft: number;
  survivorsCount: number;
  eliminatedCount: number;
}

// 玩家端状态（单一 status，只发给 player）
export type PlayerStatus = 'waiting' | 'playing' | 'eliminated' | 'winner' | 'tie';

export interface PlayerGameState {
  status: PlayerStatus;
  round: number;
  userAnswer: 'A' | 'B' | null;
  timeLeft: number;
}

// 淘汰信息
export interface EliminatedUser {
  userEmail: string;
  eliminatedReason: 'no_answer' | 'majority_choice';
}

// API 请求 body
export interface NextQuestionBody {
  question: string;
  optionA: string;
  optionB: string;
}

export interface SubmitAnswerBody {
  answer: 'A' | 'B';
}

// Socket.IO 扩展：socket.data.user
declare module 'socket.io' {
  interface SocketData {
    user: { email: string };
  }
}
