"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import {
  Play,
  RotateCcw,
  Users,
  UserX,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  Target,
  Activity,
  BarChart3,
  Zap,
  Crown,
  AlertTriangle,
  Plus,
  X,
  LogOut,
} from "lucide-react";
import {
  GameEnded,
  GameState,
  GameStats,
  MinorityQuestion,
  RoundResult,
  RoundStats,
} from "@/types";
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
  // {
  //   id: "q6",
  //   question: "你更愿意选择高薪但压力大的工作吗？",
  //   optionA: "愿意",
  //   optionB: "不愿意",
  // },
  // {
  //   id: "q7",
  //   question: "你认为人工智能会完全取代人类工作吗？",
  //   optionA: "会取代",
  //   optionB: "不会取代",
  // },
  // {
  //   id: "q8",
  //   question: "你更喜欢夏天还是冬天？",
  //   optionA: "夏天",
  //   optionB: "冬天",
  // },
  // {
  //   id: "q9",
  //   question: "你觉得网购还是实体店购物更好？",
  //   optionA: "网购更好",
  //   optionB: "实体店更好",
  // },
  // {
  //   id: "q10",
  //   question: "你认为运气比努力更重要吗？",
  //   optionA: "运气更重要",
  //   optionB: "努力更重要",
  // },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [gameStats, setGameStats] = useState<GameStats>({
    totalPlayers: 0,
    survivorsCount: 0,
    eliminatedCount: 0,
    currentRound: 0,
    status: "waiting",
    timeLeft: 0,
  });
  const [currentQuestion, setCurrentQuestion] =
    useState<MinorityQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  // 当前可发布的题目索引
  const [nextQuestionIndex, setNextQuestionIndex] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    fetchGameStats();

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
      setGameStats((prev) => ({
        ...prev,
        status: data.status,
        timeLeft: data.timeLeft,
        survivorsCount: data.survivorsCount,
        eliminatedCount: data.eliminatedCount,
        currentRound: data.round,
      }));
    });

    socket.on("new_question", (data: any) => {
      setCurrentQuestion(data.question);
      fetchGameStats();
    });

    socket.on("countdown", (data: { timeLeft: number }) => {
      setGameStats((prev) => ({
        ...prev,
        timeLeft: data.timeLeft,
      }));
    });

    socket.on("round_result", (data: RoundResult) => {
      setMessage(
        `第${gameStats.currentRound}轮结束：少数派选项是 ${data.minorityAnswer}，A选择人数为${data.answers.A}人，B选择人数为${data.answers.B}人，淘汰人数为${data.eliminatedCount}人`
      );
      fetchGameStats();
    });

    socket.on("game_ended", (data: GameEnded) => {
      setMessage(`游戏已结束！获胜者：${data.winnerEmail || "无"}`);
      fetchGameStats();
    });

    socket.on("game_reset", () => {
      setMessage("游戏已重置");
      setCurrentQuestion(null);
      setNextQuestionIndex(0);
      fetchGameStats();
    });

    return () => {
      socket.disconnect();
    };
  }, [gameStats.currentRound]);

  const fetchGameStats = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/admin/game-stats`
      );
      if (response.ok) {
        const stats = await response.json();
        setGameStats(stats);
      }
    } catch (error) {
      console.error("获取游戏统计失败:", error);
    }
  };

  const handleSubmitQuestion = async (questionIndex: number) => {
    if (questionIndex >= PRESET_QUESTIONS.length) {
      setMessage("没有更多题目了");
      return;
    }

    const questionData = PRESET_QUESTIONS[questionIndex];
    setLoading(true);
    setMessage("");

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
        setCurrentQuestion(data.question);
        setMessage(`第${questionIndex + 1}题已发布`);
        setNextQuestionIndex(questionIndex + 1);
        fetchGameStats();
      } else {
        setMessage(data.error || "发布题目失败");
      }
    } catch (error) {
      setMessage("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleResetGame = async () => {
    if (!confirm("确定要重置游戏吗？这将清除所有数据。")) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/admin/reset-game`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCurrentQuestion(null);
        setNextQuestionIndex(0);
        fetchGameStats();
      } else {
        setMessage(data.error || "重置游戏失败");
      }
    } catch (error) {
      setMessage("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const getStatusColor = () => {
    switch (gameStats.status) {
      case "playing":
        return "from-green-500 to-emerald-500";
      case "ended":
        return "from-red-500 to-pink-500";
      default:
        return "from-blue-500 to-indigo-500";
    }
  };

  const getStatusIcon = () => {
    switch (gameStats.status) {
      case "playing":
        return <Activity className="w-6 h-6" />;
      case "ended":
        return <Crown className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const getStatusText = () => {
    switch (gameStats.status) {
      case "playing":
        return "答题进行中";
      case "ended":
        return "游戏已结束";
      default:
        return "等待下一题";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  少数派游戏 - 管理控制台
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">
                    选择人数较少的选项晋级
                  </span>
                  <div className="flex items-center gap-1">
                    {connected ? (
                      <Wifi className="w-3 h-3 text-green-400" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-400" />
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
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleSubmitQuestion(nextQuestionIndex)}
                disabled={
                  loading ||
                  gameStats.status === "playing" ||
                  nextQuestionIndex >= PRESET_QUESTIONS.length
                }
                className="h-9 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:transform-none text-sm"
              >
                <Play className="w-3 h-3 mr-1" />
                {nextQuestionIndex < PRESET_QUESTIONS.length
                  ? `发布第${nextQuestionIndex + 1}题`
                  : "已完成所有题目"}
              </Button>

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
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {gameStats.currentRound}
                </p>
                <p className="text-gray-400 text-xs">当前轮次</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {gameStats.survivorsCount}
                </p>
                <p className="text-gray-400 text-xs">存活人数</p>
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
                  {gameStats.eliminatedCount}
                </p>
                <p className="text-gray-400 text-xs">淘汰人数</p>
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
                  {gameStats.totalPlayers}
                </p>
                <p className="text-gray-400 text-xs">总参与人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p
                  className={`text-xl font-bold ${
                    gameStats.timeLeft <= 10
                      ? "text-red-400 animate-pulse"
                      : "text-white"
                  }`}
                >
                  {formatTime(gameStats.timeLeft)}
                </p>
                <p className="text-gray-400 text-xs">剩余时间</p>
              </div>
            </div>
          </div>
        </div>

        {/* 预设题目预览 */}
        {!currentQuestion && gameStats.status === "waiting" && (
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-white mb-2">
                预设题目列表
              </h3>
              <p className="text-gray-400 text-sm">
                共 {PRESET_QUESTIONS.length} 道题目，当前准备发布第{" "}
                {nextQuestionIndex + 1} 题
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {PRESET_QUESTIONS.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    index === nextQuestionIndex
                      ? "bg-blue-500/20 border-blue-400/50"
                      : index < nextQuestionIndex
                      ? "bg-green-500/10 border-green-400/30"
                      : "bg-white/5 border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === nextQuestionIndex
                          ? "bg-blue-500 text-white"
                          : index < nextQuestionIndex
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        index === nextQuestionIndex
                          ? "text-blue-400"
                          : index < nextQuestionIndex
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      {index === nextQuestionIndex
                        ? "待发布"
                        : index < nextQuestionIndex
                        ? "已发布"
                        : "未发布"}
                    </span>
                  </div>

                  <h4 className="text-white font-medium mb-2 text-xs leading-relaxed">
                    {question.question}
                  </h4>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 bg-blue-500/20 rounded flex items-center justify-center text-xs text-blue-400 font-bold">
                        A
                      </span>
                      <span className="text-gray-300 text-xs truncate">
                        {question.optionA}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-4 h-4 bg-pink-500/20 rounded flex items-center justify-center text-xs text-pink-400 font-bold">
                        B
                      </span>
                      <span className="text-gray-300 text-xs truncate">
                        {question.optionB}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Question Display */}
        {currentQuestion && (
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-primary rounded-full text-white font-medium mb-4 text-sm">
                <Zap className="w-3 h-3" />第 {gameStats.currentRound} 题
              </div>
              <h2 className="text-xl font-bold text-white mb-4">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-dark rounded-xl p-4 border border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {currentQuestion.optionA}
                  </p>
                </div>
              </div>

              <div className="glass-dark rounded-xl p-4 border border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {currentQuestion.optionB}
                  </p>
                </div>
              </div>
            </div>

            {/* Round Statistics */}
            {gameStats.roundStats && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <h4 className="text-sm font-bold text-white mb-3">
                  当前轮次统计
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {gameStats.roundStats.answers.A}
                    </div>
                    <div className="text-gray-400 text-xs">选择 A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">
                      {gameStats.roundStats.answers.B}
                    </div>
                    <div className="text-gray-400 text-xs">选择 B</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-400">
                      {gameStats.roundStats.totalAnswers -
                        (gameStats.roundStats.answers.A +
                          gameStats.roundStats.answers.B)}
                    </div>
                    <div className="text-gray-400 text-xs">未答题</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="glass rounded-xl p-4 animate-scale-in">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium text-sm">{message}</span>
            </div>
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
