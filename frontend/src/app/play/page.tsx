"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";
import BattleEffect from "@/components/ui/battle-effect";
import { io, Socket } from "socket.io-client";
import { useSession, signOut } from "next-auth/react";
import {
  UserX,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  LogOut,
  User,
  CheckCircle,
  Crown,
} from "lucide-react";
import { UserGameState } from "@/types";
import Image from "next/image";

export default function PlayPage() {
  const { data: session, status } = useSession();
  const [userGameState, setUserGameState] = useState<UserGameState>({
    status: "waiting",
    round: 0,
    userAnswer: null,
    timeLeft: 0,
  });
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "">("");
  const [isEliminated, setIsEliminated] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [isTie, setIsTie] = useState(false);
  const [connected, setConnected] = useState(false);
  const [eliminatedReason, setEliminatedReason] = useState<"no_answer" | "majority_choice" | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // 添加调试信息
  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("Redirecting to login - unauthenticated");
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

    if (session.user.isDisplay) {
      router.push("/show");
      return;
    }
  }, []);

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

    socket.on("redirect", (data: { url: string; message: string }) => {
      console.log("Redirecting:", data);
      handleLogout();
    });

    socket.on("game_state", (data: UserGameState) => {
      console.log("game_state received:", data);
      setUserGameState(data);
      setSelectedOption(data.userAnswer || "");
    });

    socket.on("game_start", (data: UserGameState) => {
      setUserGameState(data);
      setSelectedOption(data.userAnswer || "");
      setIsWinner(false);
      setIsTie(false);
      setIsEliminated(false);
      handleLogout();
    });

    socket.on("new_question", (data: UserGameState) => {
      setSelectedOption(data.userAnswer || "");
      setUserGameState(data);
    });

    socket.on("round_result", (data: UserGameState) => {
      console.log("round_result received:", data);
      setUserGameState(data);
      setSelectedOption(data.userAnswer || "");
    });

    socket.on("eliminated", (data: any) => {
      console.log("eliminated event data:", data);
      const userElimination = data.eliminated.find(
        (user: any) => user.userEmail === session.user?.email
      );
      if (userElimination) {
        setIsEliminated(true);
        setEliminatedReason(userElimination.eliminatedReason);
      }
      console.log("eliminated event raw:", JSON.stringify(data, null, 2));
      console.log("session email:", session.user?.email);
    });

    socket.on("winner", (data: any) => {
      console.log("winner event data:", data);
      if (data.winnerEmail === session.user?.email) {
        setIsWinner(true);
      }
    });

    socket.on("tie", (data: any) => {
      console.log("tie event data:", data);
      if (data.finalists?.includes(session.user?.email || "")) {
        setIsTie(true);
      }
    });

    socket.on("error", (data: any) => {
      console.error("Socket 错误:", data);
      data.message;
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  const handleSubmitAnswer = async (option: "A" | "B") => {
    if (isEliminated || selectedOption) return;

    try {
      setSelectedOption(option);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/submit-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken || ""}`,
          },
          body: JSON.stringify({
            answer: option,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 spinner mx-auto mb-4"></div>
          <div className="text-muted">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relatives"
      style={{
        backgroundImage: "url(/playbgup.webp)",
      }}
    >
      {/* 全屏彩带效果 */}
      {isWinner && (
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

      {/* 开战特效 */}
      <BattleEffect isActive={isTie} duration={3000} />

      {/* Header */}
      <header className="sticky top-0 z-50 md:px-16 px-4 py-3 bg-white/25 backdrop-blur-sm border-b border-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center ml-2">
            <Image src="/bucssalogo.png" alt="logo" width={64} height={64} />
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/50 rounded-full p-2">
              {connected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-right text-black bg-white/50 rounded-full p-2">
              <p className="text-sm text-gray-800">
                <User className="inline w-5 h-5 text-gray-800" />
                {session?.user?.email
                  ? session.user.email.slice(0, 5) + "***"
                  : ""}
              </p>
            </div>
            <div
              className="text-gray-800 cursor-pointer p-2 bg-white/50 hover:bg-white/75 rounded-md transition-all duration-300"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Game Status Cards */}
      <main className="w-full h-auto px-8 py-8 items-center justify-center flex fixed top-[40vh] left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/50 rounded-md bg-white/25 backdrop-blur-sm">
        {userGameState.status === "waiting" && !isEliminated && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-blue-900 text-3xl font-bold tracking-wider">
              等待发布中...
            </p>
            <p className="text-blue-600 text-lg">请耐心等待题目发布</p>
          </div>
        )}

        {/* User Status */}
        {isEliminated && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-800 text-3xl font-bold tracking-wider">
              您已被淘汰!
            </p>
            {eliminatedReason && (
              <p className="text-red-600 text-lg font-semibold">
                原因：{eliminatedReason === "no_answer"
                  ? "您未在规定时间内选择"
                  : eliminatedReason === "majority_choice"
                  ? "您选择了多数的选项"
                  : eliminatedReason}
              </p>
            )}
            <p className="text-red-600 text-lg">
              感谢您的参与，请继续观看其他玩家的比赛！
            </p>
          </div>
        )}

        {isWinner && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-900 text-3xl font-bold tracking-wider">
              恭喜您！
            </p>
            <p className="text-green-700 text-lg">
              您是本轮游戏的冠军，请上台领奖！
            </p>
          </div>
        )}

        {isTie && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-yellow-900 text-3xl font-bold tracking-wider">
              平局出现!
            </p>
            <p className="text-yellow-700 text-lg">
              恭喜您进入决赛圈，请上台进行最后对决！
            </p>
          </div>
        )}

        {/* Question Area */}
        {userGameState.status === "playing" &&
          !isEliminated && (
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="flex items-center px-4 py-2 bg-gradient-primary text-gray-800 rounded-full text-2xl font-bold tracking-wider">
                第 {userGameState.round} 轮
              </div>

              <div className="flex flex-col items-center gap-4 justify-center">
                <Button
                  onClick={() => handleSubmitAnswer("A")}
                  disabled={!!selectedOption}
                  size="lg"
                  className={`p-6 w-64 h-32 ${
                    selectedOption === "A"
                      ? "border-green-500 border-4 bg-green-300/50 text-green-500 text-5xl font-bold"
                      : "border-white/50 bg-green-100 hover:bg-green-200 text-green-600 text-5xl font-bold"
                  }`}
                >
                  A
                </Button>

                <Button
                  onClick={() => handleSubmitAnswer("B")}
                  disabled={!!selectedOption}
                  size="lg"
                  className={`p-6 w-64 h-32 ${
                    selectedOption === "B"
                      ? "border-red-500 border-4 bg-red-300/50 text-red-500 text-5xl font-bold"
                      : "border-white/50 bg-red-100 hover:bg-red-200 text-red-600 text-5xl font-bold"
                  }`}
                >
                  B
                </Button>
              </div>

              {selectedOption && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-800 bg-white/50 rounded-md p-2">
                    <CheckCircle className="w-5 h-5" />
                    <div className="font-medium text-gray-800">
                      您已选择选项 {selectedOption}，请等待结果...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
      </main>

      {/* 底部图片 */}
      <div className="fixed bottom-12 left-20 -translate-x-1/2 z-30 w-auto flex justify-center pointer-events-none">
        <Image
          src="/dog.webp"
          alt="dog"
          className="h-40 md:h-72 object-contain drop-shadow-lg"
          width={400}
          height={400}
        />
      </div>
    </div>
  );
}
