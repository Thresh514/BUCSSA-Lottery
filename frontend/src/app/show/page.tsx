'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { Trophy, Users, UserX, Clock, Target, Wifi, WifiOff, Monitor, LogOut } from 'lucide-react';
import { GameState, NewQuestionMessage, RoundResultMessage, GameEndedMessage } from '@/types';
import { formatTime } from '@/lib/utils';

export default function ShowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionMessage | null>(null);
  const [lastResult, setLastResult] = useState<RoundResultMessage | null>(null);
  const [gameEnded, setGameEnded] = useState<GameEndedMessage | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // 检查用户权限
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (!session.user.isDisplay) {
        console.log('🚫 User is not authorized for display mode');
        router.push('/play');
        return;
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Socket.IO 连接
  useEffect(() => {
    if (!session?.user?.isDisplay || !session.user.email) return;

    const connectSocket = () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
        console.log('📺 Connecting to Socket.IO server:', serverUrl);
        
        const newSocket = io(serverUrl, {
          auth: {
            email: session.user.email,
          },
          transports: ['websocket', 'polling'],
          forceNew: true,
        });

        newSocket.on('connect', () => {
          console.log('📺 Display Socket.IO connected');
          setSocket(newSocket);
        });

        newSocket.on('game_state', (data) => {
          console.log('📺 Received game_state:', data);
          setGameState(data);
        });

        newSocket.on('new_question', (data) => {
          console.log('📺 Received new_question:', data);
          setCurrentQuestion(data);
          setLastResult(null);
          setGameEnded(null);
        });

        newSocket.on('round_result', (data) => {
          console.log('📺 Received round_result:', data);
          setLastResult(data);
        });

        newSocket.on('game_ended', (data) => {
          console.log('📺 Received game_ended:', data);
          setGameEnded(data);
          setCurrentQuestion(null);
        });

        newSocket.on('disconnect', (reason) => {
          console.log('📺 Display Socket.IO disconnected:', reason);
          setSocket(null);
        });

        newSocket.on('connect_error', (error) => {
          console.error('📺 Display Socket.IO connection error:', error);
          
          // 自动重连
          setTimeout(() => {
            console.log('📺 Attempting to reconnect...');
            connectSocket();
          }, 3000);
        });

        return newSocket;
      } catch (error) {
        console.error('📺 Error creating Socket.IO connection:', error);
        setTimeout(connectSocket, 3000);
        return null;
      }
    };

    const newSocket = connectSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [session?.user?.isDisplay, session?.user?.email]);

  // 退出登录处理函数
  const handleLogout = async () => {
    try {
      if (socket) {
        socket.disconnect();
      }
      await signOut({ callbackUrl: '/login' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (status === 'loading') {
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
              <h1 className="text-2xl font-semibold tracking-wide">国庆抽奖</h1>
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
                    {gameState.totalPlayers}
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
                      gameState.timeLeft <= 10
                        ? "text-red-400 animate-pulse"
                        : "text-white"
                    }`}
                  >
                    {formatTime(gameState.timeLeft)}
                  </p>
                  <p className="text-gray-400 text-sm">剩余时间</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 当前题目显示 */}
        {currentQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white font-medium mb-6">
                <Trophy className="w-5 h-5" />
                第 {currentQuestion.round} 题
              </div>
              <h2 className="text-4xl font-bold text-white mb-8">
                {currentQuestion.question.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/5 rounded-2xl p-8 border-2 border-blue-400/30 hover:border-blue-400/50 transition-all duration-200">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">A</span>
                  </div>
                  <p className="text-white text-2xl font-medium">
                    {currentQuestion.question.optionA}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border-2 border-pink-400/30 hover:border-pink-400/50 transition-all duration-200">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">B</span>
                  </div>
                  <p className="text-white text-2xl font-medium">
                    {currentQuestion.question.optionB}
                  </p>
                </div>
              </div>
            </div>

            {/* 倒计时 */}
            <div className="text-center mt-12">
              <div className={`text-8xl font-mono font-bold ${
                currentQuestion.timeLeft <= 10 
                  ? "text-red-400 animate-pulse" 
                  : "text-yellow-400"
              }`}>
                {Math.max(0, currentQuestion.timeLeft)}
              </div>
              <div className="text-2xl text-gray-300 mt-4">秒</div>
            </div>
          </motion.div>
        )}

        {/* 等待状态 */}
        {gameState?.status === 'waiting' && !currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-6">游戏准备中</h3>
            <p className="text-xl text-gray-300 mb-4">
              等待管理员开始游戏...
            </p>
            {gameState.totalPlayers > 0 && (
              <p className="text-lg text-blue-300">
                当前已有 {gameState.totalPlayers} 名玩家加入
              </p>
            )}
          </motion.div>
        )}

        {/* 游戏结束 */}
        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center"
          >
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h2 className="text-5xl font-bold mb-8 text-yellow-400">🎉 游戏结束</h2>
            <div className="text-3xl mb-6 text-white">{gameEnded.message}</div>
            {gameEnded.winner && (
              <div className="text-2xl text-green-400">
                🏆 获胜者: {gameEnded.winnerEmail}
              </div>
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
            <h2 className="text-4xl font-bold mb-6 text-white">连接游戏服务器中</h2>
            <p className="text-xl text-gray-300">正在获取游戏状态...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
