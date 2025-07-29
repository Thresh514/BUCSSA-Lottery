// 用户相关类型
export interface User {
  id: string;
  email: string;
  isAlive: boolean;
  joinedAt: string;
}

// 少数派游戏题目类型
export interface MinorityQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
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
  type: 'new_question' | 'round_result' | 'eliminated' | 'game_ended' | 'game_state' | 'countdown';
  data: any;
}

// 新题目消息
export interface NewQuestionMessage {
  question: MinorityQuestion;
  round: number;
  timeLeft: number;
  survivorsCount: number;
}

// 轮次结果消息
export interface RoundResultMessage {
  minorityOption: 'A' | 'B';
  minorityCount: number;
  majorityCount: number;
  eliminatedCount: number;
  survivorsCount: number;
  eliminatedUsers: string[];
}

// 游戏结束消息
export interface GameEndedMessage {
  winner: string | null;
  winnerEmail: string | null;
  message: string;
}

// 答题提交
export interface AnswerSubmission {
  userId: string;
  questionId: string;
  selectedOption: 'A' | 'B';
  submittedAt: string;
}

// 轮次统计
export interface RoundStats {
  questionId: string;
  question: string;
  optionA: string;
  optionB: string;
  A_count: number;
  B_count: number;
  noAnswer_count: number;
  totalPlayers: number;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
} 