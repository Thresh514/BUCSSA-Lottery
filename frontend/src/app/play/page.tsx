"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import { useSession, signOut } from "next-auth/react";
import {
  Users,
  UserX,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  LogOut,
  Target,
  CheckCircle,
  AlertCircle,
  Crown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { MinorityQuestion } from "@/types";

interface GameState {
  status: "waiting" | "playing" | "ended";
  currentQuestionId: string | null;
  round: number;
  timeLeft: number;
  survivorsCount: number;
  eliminatedCount: number;
}

export default function PlayPage() {
  const { data: session, status } = useSession();
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentQuestionId: null,
    round: 0,
    timeLeft: 0,
    survivorsCount: 0,
    eliminatedCount: 0,
  });
  const [currentQuestion, setCurrentQuestion] =
    useState<MinorityQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "">("");
  const [isEliminated, setIsEliminated] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // 添加调试信息
  useEffect(() => {
    // 调试信息已移除
  }, [status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!session?.user?.email) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_API_BASE!, {
      auth: {
        email: session.user.email,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("game_state", (data: GameState) => {
      setGameState(data);
    });

    socket.on("new_question", (data: any) => {
      setCurrentQuestion(data.question);
      setSelectedOption("");
      setGameState((prev) => ({
        ...prev,
        status: "playing",
        round: data.round,
        timeLeft: data.timeLeft,
        survivorsCount: data.survivorsCount,
      }));
      setMessage("");
    });

    socket.on("countdown", (data: { timeLeft: number }) => {
      setGameState((prev) => ({
        ...prev,
        timeLeft: data.timeLeft,
      }));
    });

    socket.on("round_result", (data: any) => {
      const minorityText = data.minorityOption === "A" ? "A" : "B";
      const majorityText = data.minorityOption === "A" ? "B" : "A";
      setMessage(
        `少数派选项是 ${minorityText}（${data.minorityCount}人选择），多数派选项是 ${majorityText}（${data.majorityCount}人选择），本轮淘汰 ${data.eliminatedCount} 人，剩余 ${data.survivorsCount} 人`
      );
      setGameState((prev) => ({
        ...prev,
        status: "waiting",
        survivorsCount: data.survivorsCount,
        eliminatedCount: gameState.eliminatedCount + data.eliminatedCount,
      }));
    });

    socket.on("eliminated", (data: any) => {
      if (data.userId === session.user?.email) {
        setIsEliminated(true);
        setMessage("很遗憾，您已被淘汰！");
      }
    });

    socket.on("game_ended", (data: any) => {
      setGameState((prev) => ({ ...prev, status: "ended" }));
      if (data.winner === session.user?.email) {
        setMessage("🎉 恭喜您获得第一名！");
      } else if (data.winnerEmail) {
        setMessage(`游戏结束！获胜者是 ${data.winnerEmail}`);
      } else {
        setMessage("游戏结束！");
      }
    });

    socket.on("error", (data: any) => {
      console.error("Socket 错误:", data);
      setMessage(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [router, gameState.eliminatedCount, session, status]);

  const handleSubmitAnswer = async (option: "A" | "B") => {
    if (!currentQuestion || isEliminated || selectedOption) return;

    setSelectedOption(option);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/submit-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answer: option,
            userEmail: session?.user?.email,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(`您选择了选项 ${option}，请等待结果...`);
      } else {
        setMessage(data.error || "提交答案失败");
        setSelectedOption("");
      }
    } catch (error) {
      console.error("提交答案错误:", error);
      setMessage("网络错误，请稍后重试");
      setSelectedOption("");
    }
  };

  const handleLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    await signOut({ callbackUrl: "/login" });
  };

  // 显示调试信息
  if (process.env.NODE_ENV === "development") {
    console.log("渲染状态:", {
      status,
      session: !!session,
      user: session?.user || null,
    });
  }

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 spinner mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    少数派游戏
                  </h1>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        connected ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {connected ? "已连接" : "连接中..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-600">欢迎回来</p>
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.email}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-2xl text-black"
              >
                <LogOut className="w-4 h-4 mr-2 text-black" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {gameState.round}
                </p>
                <p className="text-sm text-gray-600">当前轮次</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${
                    gameState.timeLeft <= 10
                      ? "text-red-600 animate-pulse"
                      : "text-orange-600"
                  }`}
                >
                  {formatTime(gameState.timeLeft)}
                </p>
                <p className="text-sm text-gray-600">剩余时间</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Status */}
        {isEliminated && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">您已被淘汰</h2>
            <p className="text-red-700">
              感谢您的参与，请继续观看其他玩家的比赛！
            </p>
          </div>
        )}

        {/* Game Status Cards */}
        {gameState.status === "waiting" && !isEliminated && (
          <div className="bg-white/80 border border-gray-200/50 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-blue-900 mb-2">等待下一题</h2>
            <p className="text-blue-700 text-sm">
              请耐心等待管理员发布下一题...
            </p>
          </div>
        )}

        {gameState.status === "ended" && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-yellow-900 mb-2">游戏结束</h2>
            <p className="text-yellow-700">本轮游戏已结束，感谢您的参与！</p>
          </div>
        )}

        {/* Question Area */}
        {currentQuestion && gameState.status === "playing" && !isEliminated && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-8 animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary text-black rounded-full text-sm font-medium mb-4">
                <Target className="w-4 h-4" />第 {gameState.round} 题
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {currentQuestion.question}
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
                <TrendingDown className="w-4 h-4" />
                <span>选择人数较少的选项晋级</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleSubmitAnswer("A")}
                disabled={!!selectedOption || gameState.timeLeft <= 0}
                className={`group relative p-6 rounded-2xl border-2 transition-all duration-200 hover-lift disabled:transform-none disabled:opacity-50 ${
                  selectedOption === "A"
                    ? "border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50"
                    : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                      selectedOption === "A"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-700 group-hover:bg-purple-100 group-hover:text-purple-700"
                    }`}
                  >
                    A
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-900 font-medium">
                      {currentQuestion.optionA}
                    </p>
                  </div>
                  {selectedOption === "A" && (
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handleSubmitAnswer("B")}
                disabled={!!selectedOption || gameState.timeLeft <= 0}
                className={`group relative p-6 rounded-2xl border-2 transition-all duration-200 hover-lift disabled:transform-none disabled:opacity-50 ${
                  selectedOption === "B"
                    ? "border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50"
                    : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                      selectedOption === "B"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-700 group-hover:bg-purple-100 group-hover:text-purple-700"
                    }`}
                  >
                    B
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-900 font-medium">
                      {currentQuestion.optionB}
                    </p>
                  </div>
                  {selectedOption === "B" && (
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  )}
                </div>
              </button>
            </div>

            {selectedOption && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl animate-scale-in">
                <div className="flex items-center justify-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    您已选择选项 {selectedOption}，请等待结果...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 text-center animate-scale-in">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
