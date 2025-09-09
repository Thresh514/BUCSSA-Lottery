"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  Trophy,
  Users,
  UserX,
  Clock,
  Target,
  Wifi,
  WifiOff,
  LogOut,
} from "lucide-react";
import { GameState, hasWinner, hasTie } from "@/types";
import { formatTime } from "@/lib/utils";

export default function ShowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [tie, setTie] = useState<string[] | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // 前端倒计时状态
  const [frontendTimeLeft, setFrontendTimeLeft] = useState<number>(0);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);

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

    if (!session.user.isDisplay && !session.user.isAdmin) {
      router.push("/play");
      return;
    }
  }, [status, session]);

  // // 检查用户权限
  // useEffect(() => {
  //   if (status === "authenticated" && session?.user) {
  //     if (!session.user.isDisplay) {
  //       console.log("🚫 User is not authorized for display mode");
  //       router.push("/play");
  //       return;
  //     }
  //   } else if (status === "unauthenticated") {
  //     router.push("/login");
  //     return;
  //   }
  // }, [session, status, router]);

  // Socket.IO 连接
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

    if (!session.user.isDisplay) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_API_BASE!, {
      auth: {
        email: session.user.email,
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("📺 Display Socket.IO connected");
      setSocket(socket);
    });

    socket.on("player_count_update", (data: GameState) => {
      console.log("📺 Received player_count:", data);
      setGameState((prev) => ({
        ...prev,
        survivorsCount: data.survivorsCount,
        eliminatedCount: data.eliminatedCount,
      }));
    });

    socket.on("game_start", (data: GameState) => {
      console.log("📺 Received game_start:", data);
      setGameState(data);
    });

    socket.on("game_reset", (data: GameState) => {
      setGameState(data);
    });

    socket.on("game_state", (data: GameState) => {
      console.log("📺 Received game_state:", data);
      setGameState(data);
    });

    socket.on("new_question", (data: GameState) => {
      console.log("📺 Received new_question:", data);
      setGameState(data);
      // 重置倒计时
      setCountdownActive(false);
    });

    socket.on("tie", (data: hasTie) => {
      console.log("📺 Received game_tie:", data.finalists);
      setTie(data.finalists);
      // 停止倒计时
      setCountdownActive(false);
      setFrontendTimeLeft(0);
    });

    socket.on("winner", (data: hasWinner) => {
      console.log("📺 Received winner:", data.winnerEmail);
      setWinner(data.winnerEmail);
      // 停止倒计时
      setCountdownActive(false);
      setFrontendTimeLeft(0);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("📺 Display Socket.IO disconnected:", reason);
      setSocket(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [status, session]);

  // 前端倒计时逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (countdownActive && frontendTimeLeft > 0) {
      interval = setInterval(() => {
        setFrontendTimeLeft((prev) => {
          if (prev <= 1) {
            setCountdownActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdownActive, frontendTimeLeft]);

  // 当收到新题目时，启动题目倒计时
  useEffect(() => {
    if (gameState.timeLeft !== null) {
      setFrontendTimeLeft(gameState.timeLeft);
      setCountdownActive(true);
    }
  }, [gameState.timeLeft]);

  // 退出登录处理函数
  const handleLogout = async () => {
    try {
      if (socket) {
        socket.disconnect();
      }
      // 停止倒计时
      setCountdownActive(false);
      setFrontendTimeLeft(0);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!session?.user?.isDisplay) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* 头部状态栏 */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full px-4">
              <h1 className="text-2xl font-semibold tracking-wide">
                BUCSSA 国庆晚会抽奖
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {socket ? (
                    <Wifi className="w-7 h-7 text-green-400" />
                  ) : (
                    <WifiOff className="w-7 h-7 text-red-400" />
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                  title="logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* 游戏统计面板 */}
        {gameState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-6"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {gameState.round}
                  </p>
                  <p className="text-gray-400 text-sm">当前轮次</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {gameState.survivorsCount}
                  </p>
                  <p className="text-gray-400 text-sm">存活人数</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {gameState.eliminatedCount}
                  </p>
                  <p className="text-gray-400 text-sm">淘汰人数</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {(gameState.survivorsCount || 0) +
                      (gameState.eliminatedCount || 0)}
                  </p>
                  <p className="text-gray-400 text-sm">总参与人数</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p
                    className={`text-3xl font-bold ${
                      frontendTimeLeft <= 10
                        ? "text-red-400 animate-pulse"
                        : "text-white"
                    }`}
                  >
                    {formatTime(frontendTimeLeft)}
                  </p>
                  <p className="text-gray-400 text-sm">剩余时间</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 当前题目显示 */}
        {gameState.currentQuestion && gameState.status === "playing" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white font-medium mb-6">
                <Trophy className="w-5 h-5" />第 {gameState.round} 题
              </div>
              <h2 className="text-4xl font-bold text-white mb-8">
                {gameState.currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/5 rounded-2xl p-8 border-2 border-blue-400/30 hover:border-blue-400/50 transition-all duration-200">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">A</span>
                  </div>
                  <p className="text-white text-2xl font-medium">
                    {gameState.currentQuestion?.optionA}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border-2 border-pink-400/30 hover:border-pink-400/50 transition-all duration-200">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">B</span>
                  </div>
                  <p className="text-white text-2xl font-medium">
                    {gameState.currentQuestion?.optionB}
                  </p>
                </div>
              </div>
            </div>

            {/* 倒计时 */}
            <div className="text-center mt-12">
              <div
                className={`text-8xl font-mono font-bold ${
                  frontendTimeLeft <= 10
                    ? "text-red-400 animate-pulse"
                    : "text-yellow-400"
                }`}
              >
                {Math.max(0, frontendTimeLeft)}
              </div>
              <div className="text-2xl text-gray-300 mt-4">秒</div>
            </div>
          </motion.div>
        )}

        {/* 等待状态 */}
        {gameState.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-6">游戏准备中</h3>
            <p className="text-xl text-gray-300 mb-4">等待管理员开始游戏...</p>
            {gameState.survivorsCount + gameState.eliminatedCount > 0 && (
              <p className="text-lg text-blue-300">
                当前已有 {gameState.survivorsCount + gameState.eliminatedCount}{" "}
                名玩家加入
              </p>
            )}
          </motion.div>
        )}

        {/* 游戏结束 */}
        {gameState.status === "ended" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h2 className="text-5xl font-bold mb-8 text-yellow-400">
              🎉 游戏结束
            </h2>

            {winner ? (
              <div className="space-y-6">
                <div className="text-3xl text-white mb-4">恭喜获胜者！</div>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-2xl inline-block">
                  <div className="text-4xl font-bold">🏆 {winner} 🏆</div>
                </div>
                <div className="text-xl text-gray-300">获得第一名！</div>
              </div>
            ) : tie ? (
              <div className="space-y-6">
                <div className="text-3xl text-white mb-6">
                  请两位选手上台PK！
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-6 rounded-2xl">
                    <div className="text-2xl font-bold mb-2">选手 1</div>
                    <div className="text-xl">{tie[0]}</div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-8 py-6 rounded-2xl">
                    <div className="text-2xl font-bold mb-2">选手 2</div>
                    <div className="text-xl">{tie[1]}</div>
                  </div>
                </div>

                <div className="text-2xl text-yellow-300 mt-8">
                  🎯 准备进行最终对决！
                </div>
              </div>
            ) : (
              <div className="text-3xl text-white">没有获胜者</div>
            )}
          </motion.div>
        )}

        {/* 连接中状态 */}
        {!gameState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-4xl font-bold mb-6 text-white">
              连接游戏服务器中
            </h2>
            <p className="text-xl text-gray-300">正在获取游戏状态...</p>
          </motion.div>
        )}

        {/* 在每局游戏中间展示本轮少数派答案和统计 */}
        {gameState.roundResult && gameState?.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="text-3xl font-bold text-yellow-300 mb-4">
              本轮少数派答案：
              {gameState.roundResult.minorityAnswer === "A" ? "A" : "B"}
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-8 mb-4">
              <div className="bg-blue-500/80 rounded-xl px-8 py-4 text-white text-xl font-semibold">
                选择A人数：{gameState.roundResult.answers.A}
              </div>
              <div className="bg-pink-500/80 rounded-xl px-8 py-4 text-white text-xl font-semibold">
                选择B人数：{gameState.roundResult.answers.B}
              </div>
            </div>
            <div className="text-lg text-white mb-2">
              本轮存活人数：
              <span className="font-bold text-green-300">
                {gameState.roundResult.survivorsCount}
              </span>
            </div>
            <div className="text-lg text-white">
              本轮淘汰人数：
              <span className="font-bold text-red-300">
                {gameState.roundResult.eliminatedCount}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
