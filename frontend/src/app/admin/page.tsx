"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { io, Socket } from "socket.io-client";
import {
  RotateCcw,
  Users,
  UserX,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  Target,
  Activity,
  Zap,
  Crown,
  LogOut,
} from "lucide-react";
import { GameState, MinorityQuestion } from "@/types";
import { AlertBox } from "@/components/ui/alert-box";

// 预设题目列表
const PRESET_QUESTIONS = [
  {
    id: "q1",
    question: "你觉得今年的国庆假期天气会更好吗？",
    optionA: "会更好",
    optionB: "不会更好",
  },
  {
    id: "q2",
    question: "你更喜欢在家休息还是出门旅游？",
    optionA: "在家休息",
    optionB: "出门旅游",
  },
  {
    id: "q3",
    question: "你认为月饼和粽子哪个更好吃？",
    optionA: "月饼更好吃",
    optionB: "粽子更好吃",
  },
  {
    id: "q4",
    question: "你更喜欢看电影还是看电视剧？",
    optionA: "看电影",
    optionB: "看电视剧",
  },
  {
    id: "q5",
    question: "你觉得早起还是晚睡更有害健康？",
    optionA: "早起有害",
    optionB: "晚睡有害",
  },
  {
    id: "q6",
    question: "你更愿意选择高薪但压力大的工作吗？",
    optionA: "愿意",
    optionB: "不愿意",
  },
  {
    id: "q7",
    question: "你认为人工智能会完全取代人类工作吗？",
    optionA: "会取代",
    optionB: "不会取代",
  },
  {
    id: "q8",
    question: "你更喜欢夏天还是冬天？",
    optionA: "夏天",
    optionB: "冬天",
  },
  {
    id: "q9",
    question: "你觉得网购还是实体店购物更好？",
    optionA: "网购更好",
    optionB: "实体店更好",
  },
  {
    id: "q10",
    question: "你认为运气比努力更重要吗？",
    optionA: "运气更重要",
    optionB: "努力更重要",
  },
  {
    id: "q11",
    question: "你相信一见钟情吗？",
    optionA: "相信",
    optionB: "不相信",
  },
  {
    id: "q12",
    question: "你觉得异地恋能长久吗？",
    optionA: "能长久",
    optionB: "不能长久",
  },
  {
    id: "q13",
    question: "你认为年龄差距会影响感情吗？",
    optionA: "会影响",
    optionB: "不会影响",
  },
  {
    id: "q14",
    question: "你觉得网恋靠谱吗？",
    optionA: "靠谱",
    optionB: "不靠谱",
  },
  {
    id: "q15",
    question: "你认为门当户对重要吗？",
    optionA: "重要",
    optionB: "不重要",
  },
  {
    id: "q16",
    question: "你觉得恋爱中应该AA制吗？",
    optionA: "应该AA",
    optionB: "不应该AA",
  },
  {
    id: "q17",
    question: "你认为恋爱多久适合结婚？",
    optionA: "一年以内",
    optionB: "一年以上",
  },
  {
    id: "q18",
    question: "你觉得分手后还能做朋友吗？",
    optionA: "能做朋友",
    optionB: "不能做朋友",
  },
  {
    id: "q19",
    question: "你认为恋爱中需要保持神秘感吗？",
    optionA: "需要",
    optionB: "不需要",
  },
  {
    id: "q20",
    question: "你觉得恋爱中应该完全坦诚吗？",
    optionA: "应该坦诚",
    optionB: "不应该完全坦诚",
  },
  {
    id: "q21",
    question: "你认为恋爱中需要个人空间吗？",
    optionA: "需要",
    optionB: "不需要",
  },
  {
    id: "q22",
    question: "你觉得恋爱中应该经常送礼物吗？",
    optionA: "应该经常送",
    optionB: "不需要经常送",
  },
  {
    id: "q23",
    question: "你认为恋爱中需要经常说甜言蜜语吗？",
    optionA: "需要",
    optionB: "不需要",
  },
  {
    id: "q24",
    question: "你觉得恋爱中应该经常吵架吗？",
    optionA: "应该经常吵",
    optionB: "不应该经常吵",
  },
  {
    id: "q25",
    question: "你认为恋爱中需要经常见面吗？",
    optionA: "需要经常见",
    optionB: "不需要经常见",
  },
  {
    id: "q26",
    question: "你觉得恋爱中应该经常发朋友圈吗？",
    optionA: "应该经常发",
    optionB: "不应该经常发",
  },
  {
    id: "q27",
    question: "你认为恋爱中需要经常视频通话吗？",
    optionA: "需要",
    optionB: "不需要",
  },
  {
    id: "q28",
    question: "你觉得恋爱中应该经常一起吃饭吗？",
    optionA: "应该经常一起",
    optionB: "不需要经常一起",
  },
  {
    id: "q29",
    question: "你认为恋爱中需要经常一起看电影吗？",
    optionA: "需要",
    optionB: "不需要",
  },
  {
    id: "q30",
    question: "你觉得恋爱中应该经常一起旅游吗？",
    optionA: "应该经常一起",
    optionB: "不需要经常一起",
  },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [connected, setConnected] = useState(false);
  const [tie, setTie] = useState<string[] | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const [sentQuestions, setSentQuestions] = useState<Set<number>>(new Set());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    round: 0,
    status: "waiting",
    currentQuestion: null,
    answers: { A: 0, B: 0 },
    survivorsCount: 0,
    eliminatedCount: 0,
    userAnswer: null,
    timeLeft: 0,
  });
  const socketRef = useRef<Socket | null>(null);

  // 认证检查
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

    if (!session?.user?.isAdmin) {
      router.push("/play"); // 非管理员重定向到首页
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return; // 只有认证后才建立连接

    if (!session?.user?.email) {
      return;
    }

    if (!session.user.isAdmin) {
      return;
    }

    if (session.user.isDisplay) {
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

    socket.on("game_start", (data: GameState) => {
      setGameState(data);
    });

    socket.on("game_state", (data: GameState) => {
      setGameState(data);
    });

    socket.on("new_question", (data: GameState) => {
      setGameState(data);
    });

    socket.on("round_result", (data: GameState) => {
      setGameState(data);
    });

    socket.on("tie", (data: any) => {
      setTie(data.finalists);
      setWinner(null);
    });

    socket.on("winner", (data: any) => {
      setWinner(data.winnerEmail);
      setTie(null);
    });

    socket.on("game_reset", () => {
      setSentQuestions(new Set());
    });

    return () => {
      socket.disconnect();
    };
  }, [status, session]); // Remove gameStats.currentRound dependency

  const handleSubmitQuestion = async (questionIndex: number) => {
    if (questionIndex >= PRESET_QUESTIONS.length) {
      return;
    }

    const questionData = PRESET_QUESTIONS[questionIndex];
    const isRepublish = sentQuestions.has(questionIndex);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/admin/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(questionData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSentQuestions((prev) => new Set([...prev, questionIndex]));
      } else {
        console.error(data.error || "发布题目失败");
      }
    } catch (error) {
      console.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleResetGame = async () => {
    if (!confirm("确定要重置游戏吗？这将清除所有数据。")) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/admin/reset-game`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setGameState({
          status: "waiting",
          round: 0,
          currentQuestion: null,
          answers: { A: 0, B: 0 },
          survivorsCount: 0,
          eliminatedCount: 0,
          userAnswer: null,
          timeLeft: 0,
        });
        setSentQuestions(new Set());
      } else {
        console.error("重置游戏失败:", data.error);
      }
    } catch (error) {
      console.error("重置游戏错误:", error);
    } finally {
      setLoading(false);
    }
  };

  // const handleEndRound = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch(
  //       `${process.env.NEXT_PUBLIC_API_BASE}/api/admin/end-round`,
  //       {
  //         method: "POST",
  //       }
  //     );
  //     const data = await response.json();
  //     console.log("结束轮次响应:", data);
  //     if (response.ok) {
  //       setGameState((prev) => ({ ...prev, status: "waiting" }));
  //     }
  //     else {
  //       console.error("结束轮次失败:", data.error);
  //     }
  //   } catch (error) {
  //     console.error("结束轮次错误:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const getStatusColor = () => {
    switch (gameState?.status) {
      case "playing":
        return "from-green-500 to-emerald-500";
      case "ended":
        return "from-red-500 to-pink-500";
      default:
        return "from-blue-500 to-indigo-500";
    }
  };

  const getStatusIcon = () => {
    switch (gameState?.status) {
      case "playing":
        return <Activity className="w-6 h-6" />;
      case "ended":
        return <Crown className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const getStatusText = () => {
    switch (gameState?.status) {
      case "playing":
        return "答题进行中";
      case "ended":
        return "游戏已结束";
      default:
        return "等待下一题";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900/75">
      {/* Header */}
      <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary rounded-xl flex items-center justify-center">
                <Image
                  src="/bucssalogo.png"
                  alt="logo"
                  width={48}
                  height={48}
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  BUCSSA 国庆晚会抽奖 - 管理控制台
                </h1>
                <div className="flex items-center gap-1">
                  {connected ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      connected ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {connected ? "已连接" : "连接中..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* <Button
                onClick={handleEndRound}
                disabled={loading}
                variant="destructive"
                className="h-9 px-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg font-medium transition-all duration-200 hover-lift text-sm"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                结束轮次
              </Button> */}
              <Button
                onClick={handleResetGame}
                disabled={loading}
                variant="destructive"
                className="h-9 px-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg font-medium transition-all duration-200 hover-lift text-sm"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                重置游戏
              </Button>

              <Button
                onClick={() => setShowLogoutConfirm(true)}
                className="h-9 px-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg font-medium transition-all duration-200 hover-lift"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Status Banner */}
        <div
          className={`glass rounded-2xl p-4 bg-gradient-to-r ${getStatusColor()} animate-fade-in`}
        >
          <div className="flex items-center justify-center gap-3 text-white">
            {getStatusIcon()}
            <span className="text-lg font-bold">{getStatusText()}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-slide-up">
          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {gameState?.survivorsCount}
                </p>
                <p className="text-gray-400 text-sm">存活人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <UserX className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {gameState?.eliminatedCount}
                </p>
                <p className="text-gray-400 text-sm">淘汰人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {gameState.survivorsCount ||
                    0 + gameState.eliminatedCount ||
                    0}
                </p>
                <p className="text-gray-400 text-sm">总参与人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-green-400" />
              </div>
              <div>
                {winner ? (
                  <p className="text-md font-bold text-white">{winner}</p>
                ) : (
                  <p className="text-white text-xl font-bold">暂无获胜玩家</p>
                )}

                <p className="text-gray-400 text-sm">获胜者</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                {tie ? (
                  <p className="text-md font-bold text-white">
                    {tie.join(", ")}
                  </p>
                ) : (
                  <p className="text-white text-xl font-bold">暂无平手玩家</p>
                )}

                <p className="text-gray-400 text-sm">决赛圈</p>
              </div>
            </div>
          </div>
        </div>

        {/* 题目列表 - 始终可见 */}
        <div className="glass rounded-2xl p-5 animate-slide-up">
          <div className="text-center mb-5">
            <h3 className="text-xl font-bold text-white mb-2">题目列表</h3>
            <p className="text-gray-400 text-md">
              共 {PRESET_QUESTIONS.length} 道题目，已发布 {sentQuestions.size}{" "}
              题
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3  overflow-y-auto">
            {PRESET_QUESTIONS.map((question, index) => {
              const isSent = sentQuestions.has(index);
              const isCurrentlyPlaying = gameState?.status === "playing";
              const isGameEnded = gameState?.status === "ended";
              const canPublish =
                !loading && !isCurrentlyPlaying && !isGameEnded;

              return (
                <div
                  key={question.id}
                  className="p-3 rounded-lg border transition-all duration-200 relative bg-white/5 border-white/20 hover:border-white/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-md ${
                        isSent
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-md font-medium ${
                        isSent ? "text-green-400" : "text-gray-400"
                      }`}
                    >
                      {isSent ? "已发布" : "待发布"}
                    </span>
                  </div>

                  <h4 className="text-white font-medium mb-2 text-md leading-relaxed">
                    {question.question}
                  </h4>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="flex items-center justify-center text-md text-blue-400 font-bold">
                        A
                      </span>
                      <span className="text-gray-300 text-md truncate">
                        {question.optionA}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="flex items-center justify-center text-md text-pink-400 font-bold">
                        B
                      </span>
                      <span className="text-gray-300 text-md truncate">
                        {question.optionB}
                      </span>
                    </div>
                  </div>

                  {/* 发布按钮 */}
                  <div className="flex justify-center items-center">
                    <Button
                      onClick={() => handleSubmitQuestion(index)}
                      disabled={!canPublish}
                      size="sm"
                      className={`w-full text-md transition-all duration-200 ${
                        canPublish
                          ? isSent
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white hover-lift"
                            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white hover-lift"
                          : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {isSent ? "重新发布" : "发布"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Question Display */}
        {gameState.currentQuestion && (
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-primary rounded-full text-white font-medium mb-4 text-sm">
                <Zap className="w-3 h-3" />第 {gameState.round} 题
              </div>
              <h2 className="text-xl font-bold text-white mb-4">
                {gameState.currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-dark rounded-xl p-4 border border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {gameState.currentQuestion.optionA}
                  </p>
                </div>
              </div>

              <div className="glass-dark rounded-xl p-4 border border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {gameState.currentQuestion.optionB}
                  </p>
                </div>
              </div>
            </div>

            {/* Round Statistics */}
            {gameState && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <h4 className="text-sm font-bold text-white mb-3">
                  当前轮次统计
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {gameState?.answers?.A}
                    </div>
                    <div className="text-gray-400 text-xs">选择 A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">
                      {gameState?.answers?.B}
                    </div>
                    <div className="text-gray-400 text-xs">选择 B</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-400">
                      {(gameState?.answers?.A || 0) +
                        (gameState?.answers?.B || 0) -
                        ((gameState?.answers?.A || 0) +
                          (gameState?.answers?.B || 0))}
                    </div>
                    <div className="text-gray-400 text-xs">未答题</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Logout Confirmation Alert Box */}
      <AlertBox
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="确认退出"
        message="您确定要退出登录吗？退出后将返回主界面。"
        confirmText="退出登录"
        cancelText="取消"
        confirmVariant="destructive"
      />
    </div>
  );
}
