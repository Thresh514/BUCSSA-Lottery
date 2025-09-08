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
import { GameState, RoundResult, NewQuestion, GameEnded } from "@/types";

export default function PlayPage() {
  const { data: session, status } = useSession();
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    currentQuestion: null,
    round: 0,
    timeLeft: 0,
    survivorsCount: 0,
    eliminatedCount: 0,
    userAnswer: null,
    roundResult: null,
  });
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "">("");
  const [isEliminated, setIsEliminated] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [isTie, setIsTie] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // 添加调试信息
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "loading") {
      return; // 等待认证状态
    }

    if (!session?.user?.email) {
      return;
    }

    if (session.user.isAdmin) {
      router.push("/admin");
      return;
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      return;
    }

    if (!session?.user?.email) {
      return;
    }

    if (session.user.isAdmin) {
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
      console.log("game_state received:", data);
      setGameState(data);
      setSelectedOption(data.userAnswer || "");
    });

    socket.on("game_start", (data: GameState) => {
      setGameState(data);
      setSelectedOption(data.userAnswer || "");
      setIsWinner(false);
      setIsTie(false);
      setIsEliminated(false);
    });

    socket.on("new_question", (data: GameState) => {
      setSelectedOption(data.userAnswer || "");
      setGameState(data);
    });

    socket.on("eliminated", (data: any) => {
      if (data.userId === session.user?.email) {
        setIsEliminated(true);
      }
    });

    socket.on("winner", (data: any) => {
      if (data.userId === session.user?.email) {
        setIsWinner(true);
      }
    });

    socket.on("tie", (data: any) => {
      console.log("tie event data:", data);
      if (data.finalists?.includes(session.user?.email || "")) {
        setIsTie(true);
      }
    });

    // socket.on("game_end", (data: GameEnded) => {
    //   setGameState((prev) => ({ ...prev, status: "ended" }));
    //   if (data.winnerEmail === session.user?.email) {
    //     setIsWinner(true);
    //   } else if (
    //     data.tie &&
    //     data.finalists.includes(session.user?.email || "")
    //   ) {
    //     setIsTie(true);
    //     `平局，是${data.finalists.join(", ")}进入决赛圈`;
    //   } else if (data.winnerEmail) {
    //     setIsEliminated(true);
    //     `游戏结束！获胜者是 ${data.winnerEmail}`;
    //   } else {
    //     setIsEliminated(true);
    //     ("游戏结束！");
    //   }
    // });

    socket.on("error", (data: any) => {
      console.error("Socket 错误:", data);
      data.message;
    });

    return () => {
      socket.disconnect();
    };
  }, [router, gameState.eliminatedCount, session, status]);

  const handleSubmitAnswer = async (option: "A" | "B") => {
    if (!gameState.currentQuestion || isEliminated || selectedOption) return;

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
        `您选择了选项 ${option}，请等待结果...`;
      } else {
        data.error || "提交答案失败";
        setSelectedOption("");
      }
    } catch (error) {
      console.error("提交答案错误:", error);
      ("网络错误，请稍后重试");
      setSelectedOption("");
    }
  };

  const handleLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    await signOut({ callbackUrl: "/login" });
  };

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

        {isWinner && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-900 mb-2">恭喜您！</h2>
            <p className="text-green-700">
              您是本轮游戏的冠军！感谢您的精彩表现！
            </p>
          </div>
        )}

        {isTie && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 text-center animate-slide-up">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-yellow-900 mb-2">平局</h2>
            <p className="text-yellow-700">
              恭喜您进入决赛圈，请上台进行最后对决！
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

        {/* Question Area */}
        {gameState.currentQuestion && gameState.status === "playing" && !isEliminated && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-8 animate-slide-up">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary text-black rounded-full text-sm font-medium mb-4">
                  <Target className="w-4 h-4" />第 {gameState.round} 题
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {gameState.currentQuestion.question}
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
                        {gameState.currentQuestion.optionA}
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
                        {gameState.currentQuestion.optionB}
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
        {/* {message && (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 text-center animate-scale-in">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )} */}
      </main>
    </div>
  );
}
