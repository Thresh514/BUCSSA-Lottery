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

// for admin and display
export interface GameState {
  round: number;
  status: "waiting" | "playing" | "ended";
  currentQuestion: MinorityQuestion | null;
  answers: { A: number; B: number } | null;
  survivorsCount: number;
  eliminatedCount: number;
  timeLeft: number;
}

// for player（status 含游戏阶段 + 玩家结果，由前端根据服务端 payload 推导）
export interface UserGameState {
  status: 'waiting' | 'playing' | 'eliminated' | 'winner' | 'tie';
  round: number;
  userAnswer: 'A' | 'B' | null;
  timeLeft: number;
}

// 轮次结果消息
export interface RoundResult {
  minorityAnswer: 'A' | 'B';
  majorityAnswer: 'A' | 'B';
  answers: { A: number; B: number };
}

// Socket 事件 payload（与后端一致，带运行时校验）
export interface EliminatedUserPayload {
  userEmail: string;
  eliminatedReason: 'no_answer' | 'majority_choice';
}

export interface EliminatedEventPayload {
  eliminated: EliminatedUserPayload[];
}

export interface WinnerEventPayload {
  winnerEmail: string;
}

export interface TieEventPayload {
  finalists: string[];
}

export interface SocketErrorPayload {
  message?: string;
  error?: string;
}

/** 运行时校验 Socket 事件 payload */
export function isEliminatedPayload(data: unknown): data is EliminatedEventPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'eliminated' in data &&
    Array.isArray((data as EliminatedEventPayload).eliminated) &&
    (data as EliminatedEventPayload).eliminated.every(
      (u): u is EliminatedUserPayload =>
        typeof u === 'object' && u !== null && typeof (u as EliminatedUserPayload).userEmail === 'string' && ((u as EliminatedUserPayload).eliminatedReason === 'no_answer' || (u as EliminatedUserPayload).eliminatedReason === 'majority_choice')
    )
  );
}

export function isWinnerPayload(data: unknown): data is WinnerEventPayload {
  return typeof data === 'object' && data !== null && 'winnerEmail' in data && typeof (data as WinnerEventPayload).winnerEmail === 'string';
}

export function isTiePayload(data: unknown): data is TieEventPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'finalists' in data &&
    Array.isArray((data as TieEventPayload).finalists) &&
    (data as TieEventPayload).finalists.every((e) => typeof e === 'string')
  );
}

export function isSocketErrorPayload(data: unknown): data is SocketErrorPayload {
  return typeof data === 'object' && data !== null && ('message' in data || 'error' in data);
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