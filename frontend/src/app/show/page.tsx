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
  User,
  Wifi,
  WifiOff,
  LogOut,
  QrCode,
} from "lucide-react";
import { GameState, hasWinner, hasTie } from "@/types";
import { formatTime } from "@/lib/utils";
import BackgroundImage from "@/components/game/BackgroundImage";
import AnimatedBarChart from "@/components/ui/animated-bar-chart";
import Confetti from "react-confetti";
import Image from "next/image";

export default function ShowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [tie, setTie] = useState<string[] | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [showTieModal, setShowTieModal] = useState<boolean>(false);
  const [updatedWinnerTie, setUpdatedWinnerTie] = useState<boolean>(false);
  const [showQRCode, setShowQRCode] = useState(false);

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
  }, []);

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

    socket.on("countdown_update", (data: { timeLeft: number }) => {
      setFrontendTimeLeft(data.timeLeft);
      setCountdownActive(true);
    });

    socket.on("game_start", (data: GameState) => {
      console.log("📺 Received game_start:", data);
      setGameState(data);
      setWinner(null);
      setTie(null);
      setUpdatedWinnerTie(true);
    });

    socket.on("game_state", (data: GameState) => {
      console.log("📺 Received game_state:", data);
      setGameState(data);
    });

    socket.on("new_question", (data: GameState) => {
      console.log("📺 Received new_question:", data);
      setGameState(data);
      // 重置倒计时
      setFrontendTimeLeft(data.timeLeft);
      setCountdownActive(true);
    });

    socket.on("round_result", (data: GameState) => {
      console.log("📺 Received round_result:", data);
      setGameState(data);
      // 停止倒计时
      setCountdownActive(false);
      setFrontendTimeLeft(0);
    });

    socket.on("tie", (data: hasTie) => {
      console.log("📺 Received game_tie:", data.finalists);
      if (data.finalists && data.finalists.length === 2) {
        setTie(data.finalists);
        setCountdownActive(false);
        setFrontendTimeLeft(0);
      }
      setUpdatedWinnerTie(true);
    });

    socket.on("winner", (data: hasWinner) => {
      console.log("📺 Received winner:", data.winnerEmail);
      setWinner(data.winnerEmail);
      setCountdownActive(false);
      setFrontendTimeLeft(0);
      setUpdatedWinnerTie(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

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

  // 管理全屏获胜者模态框
  useEffect(() => {
    if (winner) {
      setShowWinnerModal(true);
      const timer = setTimeout(() => {
        setShowWinnerModal(false);
      }, 180000);
      return () => clearTimeout(timer);
    } else {
      setShowWinnerModal(false);
    }
  }, [winner]);

  // 管理全屏平局模态框
  useEffect(() => {
    if (tie && tie.length >= 2) {
      setShowTieModal(true);
      const timer = setTimeout(() => {
        setShowTieModal(false);
      }, 180000);
      return () => clearTimeout(timer);
    } else {
      setShowTieModal(false);
    }
  }, [tie]);

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
    <>
      {/* 背景图片 */}
      <BackgroundImage
        imageUrl="bgup.webp" // 在这里设置你的背景图片路径
        overlayOpacity={0.05} // 整体遮罩透明度，0-1之间
        centerMask={true} // 启用中间渐变蒙版
        maskWidth={90} // 中间蒙版宽度，80%的屏幕宽度
      />

      {/* 全屏获胜者模态框 */}
      {showWinnerModal && winner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowWinnerModal(false)}
        >
          <motion.div
            className="text-center cursor-pointer space-y-16"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-8 p-4"
              animate={{
                textShadow: [
                  "0 0 20px #fbbf24",
                  "0 0 40px #f59e0b",
                  "0 0 20px #fbbf24",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              🏆 {winner} 🏆
            </motion.div>
            <motion.div
              className="text-6xl text-yellow-300 font-semibold mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              恭喜获得第一名！
            </motion.div>
            <motion.div
              className="mt-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full" />
            </motion.div>
            <motion.div
              className="mt-8 text-lg text-gray-300 p-4 border border-white/50 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              点击此处关闭
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* 全屏平局 VS 模态框 */}
      {showTieModal && tie && tie.length >= 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowTieModal(false)}
        >
          <motion.div
            className="w-full h-full flex items-center justify-between px-8 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 左侧选手 */}
            <motion.div
              className="flex-2/5 max-w-lg items-center justify-center space-y-4"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.div
                className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600 break-words px-8"
                animate={{
                  textShadow: [
                    "0 0 20px #ef4444",
                    "0 0 40px #dc2626",
                    "0 0 20px #ef4444",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  wordBreak: "break-all",
                  hyphens: "auto",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                {tie[0] && tie[0].length > 25
                  ? (() => {
                      const email = tie[0];
                      const atIndex = email.indexOf("@");
                      if (atIndex > 0) {
                        const username = email.substring(0, atIndex);
                        const domain = email.substring(atIndex);
                        return (
                          <>
                            {username.length > 15
                              ? `${username.substring(0, 15)}...`
                              : username}
                            <br />
                            {domain}
                          </>
                        );
                      }
                      return email.length > 25
                        ? `${email.substring(0, 25)}...`
                        : email;
                    })()
                  : tie[0]}
              </motion.div>
              <div className="text-4xl text-red-300 font-semibold text-center">
                选手 1
              </div>
            </motion.div>

            {/* 中间 VS */}
            <motion.div
              className="flex-1/5 mx-2 items-center justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
            >
              <div className="text-9xl font-bold text-center">⚔️</div>
            </motion.div>

            {/* 右侧选手 */}
            <motion.div
              className="flex-2/5 max-w-lg items-center justify-center space-y-4"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.div
                className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-green-500 to-green-600 break-words px-8"
                animate={{
                  textShadow: [
                    "0 0 20px #22c55e",
                    "0 0 40px #16a34a",
                    "0 0 20px #22c55e",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  wordBreak: "break-all",
                  hyphens: "auto",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                {tie[1] && tie[1].length > 25
                  ? (() => {
                      const email = tie[1];
                      const atIndex = email.indexOf("@");
                      if (atIndex > 0) {
                        const username = email.substring(0, atIndex);
                        const domain = email.substring(atIndex);
                        return (
                          <>
                            {username.length > 15
                              ? `${username.substring(0, 15)}...`
                              : username}
                            <br />
                            {domain}
                          </>
                        );
                      }
                      return email.length > 25
                        ? `${email.substring(0, 25)}...`
                        : email;
                    })()
                  : tie[1]}
              </motion.div>
              <div className="text-4xl text-green-300 font-semibold text-center">
                选手 2
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-8 text-lg text-gray-300 fixed bottom-12 left-1/2 -translate-x-1/2 text-center p-4 border border-white/50 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            点击此处关闭
          </motion.div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        {/* 全屏彩带效果 */}
        {winner && (
          <Confetti
            width={typeof window !== "undefined" ? window.innerWidth : 0}
            height={typeof window !== "undefined" ? window.innerHeight : 0}
            recycle={false}
            numberOfPieces={1000}
            gravity={0.3}
            initialVelocityY={20}
            initialVelocityX={5}
            colors={[
              "#FFD700",
              "#FFA500",
              "#FF8C00",
              "#FFB347",
              "#F4A460",
              "#DAA520",
              "#B8860B",
              "#CD853F",
              "#DEB887",
              "#F5DEB3",
              "#FFF8DC",
              "#FFE4B5",
              "#FFEFD5",
              "#FFFACD",
              "#FFFFE0",
              "#FFE135",
              "#FFD700",
              "#FFC107",
              "#FFB300",
              "#FFA000",
              "#FF8F00",
              "#FF6F00",
              "#FF5722",
              "#E65100",
              "#BF360C",
            ]}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          />
        )}

        {/* 头部状态栏 */}
        <div className="bg-black/10 backdrop-blur-sm border-b border-white/20 border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between w-full px-4">
                <div className="flex items-center gap-4">
                  <Image
                    src="/bucssalogo.png"
                    alt="logo"
                    width={64}
                    height={64}
                  />
                  <h1 className="text-3xl font-light tracking-wider">
                    BUCSSA 国庆晚会抽奖
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    {socket ? (
                      <Wifi className="w-7 h-7 text-green-400" />
                    ) : (
                      <WifiOff className="w-7 h-7 text-red-400" />
                    )}
                  </div>
                  <button
                      onClick={() => setShowQRCode(true)}
                      className="hidden md:block p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                      title="显示二维码"
                    >
                    <QrCode className="w-6 h-6" />
                  </button>
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

        {/* QR码弹窗 */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-lg mx-4 border border-white/20">
            <div className="text-center space-y-4">
              <div className="w-96 h-96 bg-white rounded-lg flex items-center justify-center mx-auto">
                <div className="text-white text-center p-4">
                  <Image src="/qrcode.png" alt="qrcode" width={400} height={400} />
                </div>
              </div>
              <p className="text-white text-center text-2xl font-bold">lottery.bucssa.org</p>
              
              <button
                onClick={() => setShowQRCode(false)}
                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Debug Section */}
        {/* <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-black/20 backdrop-blur-sm border border-yellow-400/50 rounded-lg p-4 mb-4">
            <h3 className="text-yellow-400 font-bold text-lg mb-3">
              🐛 Debug Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-gray-300">
                  <span className="text-yellow-300">winner:</span>{" "}
                  {winner ? `"${winner}"` : "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">tie:</span>{" "}
                  {tie ? `[${tie.join(", ")}]` : "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">showWinnerModal:</span>{" "}
                  {showWinnerModal ? "true" : "false"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">showTieModal:</span>{" "}
                  {showTieModal ? "true" : "false"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">updatedWinnerTie:</span>{" "}
                  {updatedWinnerTie ? "true" : "false"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-300">
                  <span className="text-yellow-300">gameState.status:</span>{" "}
                  {gameState?.status || "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">gameState.round:</span>{" "}
                  {gameState?.round || "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">
                    gameState.survivorsCount:
                  </span>{" "}
                  {gameState?.survivorsCount || "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">
                    gameState.eliminatedCount:
                  </span>{" "}
                  {gameState?.eliminatedCount || "null"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-300">
                  <span className="text-yellow-300">frontendTimeLeft:</span>{" "}
                  {frontendTimeLeft}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">countdownActive:</span>{" "}
                  {countdownActive ? "true" : "false"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">socket connected:</span>{" "}
                  {socket ? "true" : "false"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">answers A:</span>{" "}
                  {gameState?.answers?.A || "null"}
                </div>
                <div className="text-gray-300">
                  <span className="text-yellow-300">answers B:</span>{" "}
                  {gameState?.answers?.B || "null"}
                </div>
              </div>
            </div>
          </div>
        </div> */}

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* 游戏统计面板 */}
          {gameState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-6"
            >
              <div className="border border-white/50 rounded-md bg-white/25 backdrop-blur-md p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-5xl font-bold text-center text-white">
                      {gameState.round}
                    </p>
                    <p className="text-gray-800 text-base font-semibold">
                      当前轮次
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <User className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-5xl font-bold text-center text-white">
                      {gameState.survivorsCount}
                    </p>
                    <p className="text-gray-800 text-base font-semibold">
                      存活人数
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <UserX className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-5xl font-bold text-center text-white">
                      {gameState.eliminatedCount}
                    </p>
                    <p className="text-gray-800 text-base font-semibold">
                      淘汰人数
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-5xl font-bold text-center text-white">
                      {(gameState.survivorsCount || 0) +
                        (gameState.eliminatedCount || 0)}
                    </p>
                    <p className="text-gray-800 text-base font-semibold">
                      总参与人数
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-white/50 rounded-md bg-white/25 backdrop-blur-md p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <p
                      className={`text-5xl font-bold text-center ${
                        frontendTimeLeft <= 10
                          ? "text-red-500 animate-pulse"
                          : "text-white"
                      }`}
                    >
                      {formatTime(frontendTimeLeft)}
                    </p>
                    <p className="text-gray-800 text-base font-semibold text-center">
                      剩余时间
                    </p>
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
              className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-8 space-y-8"
            >
              <div className="text-center mb-8 flex flex-col items-center justify-center space-y-8">
                <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm rounded-md p-4">
                  <Trophy className="w-6 h-6 text-gray-800 font-light" />
                  <p className="text-gray-800 text-2xl font-light">
                    第 {gameState.round} 题
                  </p>
                </div>
                <h2 className="text-6xl font-light text-gray-800">
                  {gameState.currentQuestion.question}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-7xl mx-auto">
                <div className="border border-white/50 rounded-md backdrop-blur-sm p-8 bg-green-200/25">
                  <div className="flex items-center gap-4 justify-center">
                    <div className="w-12 h-12 rounded-md flex items-center justify-center">
                      <p className="font-normal text-6xl text-green-400">A</p>
                    </div>
                    <p className="text-gray-800 text-5xl font-light">
                      {gameState.currentQuestion?.optionA}
                    </p>
                  </div>
                </div>

                <div className="border border-white/50 rounded-md  backdrop-blur-sm p-8 bg-red-200/25">
                  <div className="flex items-center gap-4 justify-center">
                    <div className="w-12 h-12 rounded-md flex items-center justify-center">
                      <p className="font-normal text-6xl text-red-400">B</p>
                    </div>
                    <p className="text-gray-800 text-5xl font-light">
                      {gameState.currentQuestion?.optionB}
                    </p>
                  </div>
                </div>
              </div>

              {/* 倒计时 */}
              <div className="text-center flex items-center justify-center">
                <div className="relative">
                  {/* 圆形包裹背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-full blur-xl scale-110"></div>
                  <div className="absolute inset-0 bg-white/20 rounded-full"></div>

                  {/* 倒计时数字 */}
                  <div
                    className={`relative text-9xl font-bold bg-white/50 backdrop-blur-sm rounded-full w-48 h-48 flex items-center justify-center border-4 ${
                      frontendTimeLeft <= 10
                        ? "text-red-500 animate-pulse border-red-400/50"
                        : "text-yellow-400 border-yellow-400/50"
                    }`}
                  >
                    {Math.max(0, frontendTimeLeft)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 等待状态 */}
          {gameState.status === "waiting" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-6 text-center"
            >
              <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Trophy className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800 mb-6">
                游戏准备中
              </h3>
              <p className="text-xl text-gray-700 mb-4">
                等待管理员开始游戏...
              </p>
              {gameState.survivorsCount + gameState.eliminatedCount > 0 && (
                <p className="text-lg text-gray-500">
                  当前已有{" "}
                  {gameState.survivorsCount + gameState.eliminatedCount}{" "}
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
              className="border border-white/50 rounded-md bg-white/25 backdrop-blur-sm p-12 text-center"
            >
              {!winner && !tie && (
                <>
                  <div className="w-24 h-24 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Trophy className="w-12 h-12 text-yellow-500" />
                  </div>
                  <h2 className="text-5xl font-bold mb-8 text-gray-800">
                    游戏结束!
                  </h2>
                </>
              )}

              {winner ? (
                <div className="space-y-16 max-w-6xl mx-auto p-16">
                  <div className="text-6xl text-yellow-500/80 font-normal mb-4">
                    恭喜一等奖获得者!
                  </div>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-2xl">
                    <div className="text-6xl font-light">🏆 {winner} 🏆</div>
                  </div>
                </div>
              ) : tie ? (
                <div className="space-y-16 max-w-6xl mx-auto p-16">
                  <div className="text-5xl text-red-700 font-normal mb-4">
                    请两位选手上台PK, 竞争第一名!
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <div className="bg-green-500/75 text-white px-12 py-8 rounded-3xl border-2 border-white/75">
                      <div className="text-4xl font-bold mb-4 text-center">
                        选手 1
                      </div>
                      <div className="text-3xl font-light text-center break-words">
                        {tie[0]}
                      </div>
                    </div>

                    <div className="bg-red-500/75 text-white px-12 py-8 rounded-3xl border-2 border-white/75">
                      <div className="text-4xl font-bold mb-4 text-center">
                        选手 2
                      </div>
                      <div className="text-3xl font-light text-center break-words">
                        {tie[1]}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden"></div>
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
          {gameState &&
            gameState?.status === "waiting" &&
            gameState?.answers &&
            !winner &&
            !tie &&
            updatedWinnerTie && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl mx-auto px-8 py-8 items-center justify-center flex fixed top-[40vh] left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/50 rounded-md bg-white/25 backdrop-blur-sm"
              >
                <div className="text-center space-y-6 w-full">
                  {/* 存活答案标题 */}
                  <div className="space-y-4">
                    <h2 className="text-yellow-900 text-2xl font-bold tracking-wider">
                      本轮存活答案
                    </h2>
                    <div className="text-5xl font-bold text-yellow-600">
                      {(gameState?.answers?.A ?? 0) <
                      (gameState?.answers?.B ?? 0)
                        ? "A"
                        : (gameState?.answers?.B ?? 0) <
                          (gameState?.answers?.A ?? 0)
                        ? "B"
                        : "平局"}
                    </div>
                  </div>

                  {/* 选择统计柱状图 */}
                  <div className="my-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                      选择统计
                    </h3>
                    <AnimatedBarChart
                      data={[
                        {
                          label: "选择A人数",
                          value: Math.max(
                            0,
                            Number(gameState?.answers?.A) || 0
                          ),
                          color: "#1e40af",
                          bgColor: "#dbeafe",
                          borderColor: "#3b82f6",
                        },
                        {
                          label: "选择B人数",
                          value: Math.max(
                            0,
                            Number(gameState?.answers?.B) || 0
                          ),
                          color: "#be185d",
                          bgColor: "#fce7f3",
                          borderColor: "#ec4899",
                        },
                      ]}
                      maxValue={
                        Math.max(
                          Math.max(0, Number(gameState?.answers?.A) || 0),
                          Math.max(0, Number(gameState?.answers?.B) || 0)
                        ) || 1
                      }
                      duration={2}
                    />
                  </div>

                  {/* 结果统计柱状图 */}
                  {/* <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                      结果统计
                    </h3>
                    <AnimatedBarChart
                      data={[
                        {
                          label: "本轮存活人数",
                          value: (() => {
                            const a = Math.max(
                              0,
                              Number(gameState?.answers?.A) || 0
                            );
                            const b = Math.max(
                              0,
                              Number(gameState?.answers?.B) || 0
                            );
                            return a === b || a === 0 || b === 0
                              ? Math.max(a, b)
                              : 0;
                          })(),
                          color: "#166534",
                          bgColor: "#dcfce7",
                          borderColor: "#22c55e",
                        },
                        {
                          label: "本轮淘汰人数",
                          value: (() => {
                            const a = Math.max(
                              0,
                              Number(gameState?.answers?.A) || 0
                            );
                            const b = Math.max(
                              0,
                              Number(gameState?.answers?.B) || 0
                            );
                            return a === b || a === 0 || b === 0
                              ? Math.min(a, b)
                              : 0;
                          })(),
                          color: "#991b1b",
                          bgColor: "#fecaca",
                          borderColor: "#ef4444",
                        },
                      ]}
                      maxValue={(() => {
                        const a = Math.max(
                          0,
                          Number(gameState?.answers?.A) || 0
                        );
                        const b = Math.max(
                          0,
                          Number(gameState?.answers?.B) || 0
                        );
                        const survived =
                          a === b || a === 0 || b === 0 ? Math.max(a, b) : 0;
                        const eliminated =
                          a === b || a === 0 || b === 0 ? Math.min(a, b) : 0;
                        return Math.max(survived, eliminated) || 1;
                      })()}
                      duration={2.5}
                    />
                  </div> */}
                </div>
              </motion.div>
            )}
        </div>
      </div>
    </>
  );
}
