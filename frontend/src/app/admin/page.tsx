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
    question: "玉兔怎么上天的？",
    optionA: "被嫦娥踹上去的",
    optionB: "喝丝瓜汤飞升了",
  },
  {
    id: "q2",
    question: "嫦娥最想要？",
    optionA: "余生哥哥给她买包包",
    optionB: "鸡排主理人做鸡排",
  },
  {
    id: "q3",
    question: "你是什么？",
    optionA: "小馋猫",
    optionB: "小奶狗",
  },
  {
    id: "q4",
    question: "月亮为什么这么圆？",
    optionA: "吴刚用 Photoshop 修的",
    optionB: "打了玻尿酸",
  },
  {
    id: "q5",
    question: "嫦娥最怕什么？",
    optionA: "月饼过期",
    optionB: "天上没 WiFi",
  },
  {
    id: "q6",
    question: "如果中秋月饼和国庆烟花只能留一个，你选？",
    optionA: "吃饱了再说",
    optionB: "看爽了再说",
  },
  {
    id: "q7",
    question: "如果月亮突然有信号塔了，嫦娥第一句会发什么朋友圈？",
    optionA: "终于连上网了，买了否冷",
    optionB: "家人们十个赞今天不上班",
  },
  {
    id: "q8",
    question: "为什么玉兔总跟着嫦娥走？",
    optionA: "开团秒跟",
    optionB: "害怕嫦娥点外卖不叫他",
  },
  {
    id: "q9",
    question: "嫦娥在月球上点的一个饭团外卖是什么？",
    optionA: "麻辣兔头",
    optionB: "兔兔那么可爱，怎么可以吃兔兔～",
  },
  {
    id: "q10",
    question: "吃了玉兔捣的药我…？",
    optionA: "头怎么感觉尖尖的",
    optionB: "变成火辣辣的纯情蟑螂",
  },
  {
    id: "q11",
    question: "怎样让后裔奔月？",
    optionA: "来咯来咯后裔哥哥上车咯",
    optionB: "堂吉柯德式的冲锋",
  },
  {
    id: "q12",
    question: "梦幻月亮上的嫦娥为什么哭哭？",
    optionA: "幻梦都破碎",
    optionB: "月亮上的天气那是翻云又覆雨",
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
            Authorization: `Bearer ${session?.user.accessToken}`,
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user.accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setGameState({
          round: 0,
          status: "waiting",
          currentQuestion: null,
          answers: { A: 0, B: 0 },
          survivorsCount: 0,
          eliminatedCount: 0,
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
