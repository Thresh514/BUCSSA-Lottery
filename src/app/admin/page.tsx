'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';
import { Play, RotateCcw, Users, UserX, Clock, Trophy, Wifi, WifiOff, Target, Activity, BarChart3, Zap, Crown, AlertTriangle, Plus, X } from 'lucide-react';
import { MinorityQuestion, RoundStats } from '@/types';

interface GameStats {
  totalPlayers: number;
  survivorsCount: number;
  eliminatedCount: number;
  currentRound: number;
  status: string;
  timeLeft: number;
  roundStats?: RoundStats;
}

export default function AdminPage() {
  const [gameStats, setGameStats] = useState<GameStats>({
    totalPlayers: 0,
    survivorsCount: 0,
    eliminatedCount: 0,
    currentRound: 0,
    status: 'waiting',
    timeLeft: 0,
  });
  const [currentQuestion, setCurrentQuestion] = useState<MinorityQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);
  
  // 题目发布表单
  const [questionForm, setQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchGameStats();

    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('管理员Socket连接成功');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('管理员Socket连接断开');
    });

    socket.on('game_state', (data: any) => {
      setGameStats(prev => ({
        ...prev,
        status: data.status,
        timeLeft: data.timeLeft,
        survivorsCount: data.survivorsCount,
        eliminatedCount: data.eliminatedCount,
        currentRound: data.round,
      }));
    });

    socket.on('new_question', (data: any) => {
      setCurrentQuestion(data.question);
      fetchGameStats();
    });

    socket.on('countdown', (data: { timeLeft: number }) => {
      setGameStats(prev => ({
        ...prev,
        timeLeft: data.timeLeft,
      }));
    });

    socket.on('round_result', (data: any) => {
      setMessage(`第${gameStats.currentRound}轮结束：少数派选项是 ${data.minorityOption}，A选择${data.majorityCount}人，B选择${data.minorityCount}人，淘汰 ${data.eliminatedCount} 人`);
      fetchGameStats();
    });

    socket.on('game_ended', (data: any) => {
      setMessage(`游戏已结束！获胜者：${data.winnerEmail || '无'}`);
      fetchGameStats();
    });

    socket.on('game_reset', () => {
      setMessage('游戏已重置');
      setCurrentQuestion(null);
      setShowQuestionForm(false);
      fetchGameStats();
    });

    return () => {
      socket.disconnect();
    };
  }, [gameStats.currentRound]);

  const fetchGameStats = async () => {
    try {
      const response = await fetch('/api/admin/game-stats');
      if (response.ok) {
        const stats = await response.json();
        setGameStats(stats);
      }
    } catch (error) {
      console.error('获取游戏统计失败:', error);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!questionForm.question || !questionForm.optionA || !questionForm.optionB) {
      setMessage('请填写完整的题目内容');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/next-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionForm),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentQuestion(data.question);
        setMessage(`第${gameStats.currentRound + 1}题已发布`);
        setShowQuestionForm(false);
        setQuestionForm({ question: '', optionA: '', optionB: '' });
        fetchGameStats();
      } else {
        setMessage(data.error || '发布题目失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetGame = async () => {
    if (!confirm('确定要重置游戏吗？这将清除所有数据。')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/reset-game', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCurrentQuestion(null);
        setShowQuestionForm(false);
        fetchGameStats();
      } else {
        setMessage(data.error || '重置游戏失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (gameStats.status) {
      case 'playing': return 'from-green-500 to-emerald-500';
      case 'ended': return 'from-red-500 to-pink-500';
      default: return 'from-blue-500 to-indigo-500';
    }
  };

  const getStatusIcon = () => {
    switch (gameStats.status) {
      case 'playing': return <Activity className="w-6 h-6" />;
      case 'ended': return <Crown className="w-6 h-6" />;
      default: return <Clock className="w-6 h-6" />;
    }
  };

  const getStatusText = () => {
    switch (gameStats.status) {
      case 'playing': return '答题进行中';
      case 'ended': return '游戏已结束';
      default: return '等待下一题';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">少数派游戏 - 管理控制台</h1>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300">选择人数较少的选项晋级</span>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      connected ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {connected ? '已连接' : '连接中...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => setShowQuestionForm(!showQuestionForm)}
                disabled={loading || gameStats.status === 'playing'}
                className="h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:transform-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                发布新题目
              </Button>
              
              <Button
                onClick={handleResetGame}
                disabled={loading}
                variant="destructive"
                className="h-12 px-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-medium transition-all duration-200 hover-lift"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置游戏
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Status Banner */}
        <div className={`glass rounded-3xl p-6 bg-gradient-to-r ${getStatusColor()} animate-fade-in`}>
          <div className="flex items-center justify-center gap-4 text-white">
            {getStatusIcon()}
            <span className="text-2xl font-bold">{getStatusText()}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-slide-up">
          <div className="glass rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{gameStats.currentRound}</p>
                <p className="text-gray-400 text-sm">当前轮次</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{gameStats.survivorsCount}</p>
                <p className="text-gray-400 text-sm">存活人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{gameStats.eliminatedCount}</p>
                <p className="text-gray-400 text-sm">淘汰人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{gameStats.totalPlayers}</p>
                <p className="text-gray-400 text-sm">总参与人数</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className={`text-3xl font-bold ${
                  gameStats.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
                }`}>
                  {formatTime(gameStats.timeLeft)}
                </p>
                <p className="text-gray-400 text-sm">剩余时间</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Form */}
        {showQuestionForm && (
          <div className="glass rounded-3xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">发布新题目</h3>
              <Button
                onClick={() => setShowQuestionForm(false)}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">题目内容</label>
                <Input
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="请输入题目内容..."
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">选项 A</label>
                  <Input
                    value={questionForm.optionA}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, optionA: e.target.value }))}
                    placeholder="选项A内容..."
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">选项 B</label>
                  <Input
                    value={questionForm.optionB}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, optionB: e.target.value }))}
                    placeholder="选项B内容..."
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button
                  onClick={handleSubmitQuestion}
                  disabled={loading || !questionForm.question || !questionForm.optionA || !questionForm.optionB}
                  className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 spinner"></div>
                      发布中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      发布题目
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current Question Display */}
        {currentQuestion && (
          <div className="glass rounded-3xl p-8 animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary rounded-full text-white font-medium mb-6">
                <Zap className="w-4 h-4" />
                第 {gameStats.currentRound} 题
              </div>
              <h2 className="text-3xl font-bold text-white mb-8">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-dark rounded-2xl p-6 border-2 border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <p className="text-white text-lg font-medium">{currentQuestion.optionA}</p>
                </div>
              </div>
              
              <div className="glass-dark rounded-2xl p-6 border-2 border-white/20 hover:border-white/30 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">B</span>
                  </div>
                  <p className="text-white text-lg font-medium">{currentQuestion.optionB}</p>
                </div>
              </div>
            </div>

            {/* Round Statistics */}
            {gameStats.roundStats && (
              <div className="mt-8 p-6 bg-white/5 rounded-2xl">
                <h4 className="text-xl font-bold text-white mb-4">当前轮次统计</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{gameStats.roundStats.A_count}</div>
                    <div className="text-gray-400">选择 A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{gameStats.roundStats.B_count}</div>
                    <div className="text-gray-400">选择 B</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{gameStats.roundStats.noAnswer_count}</div>
                    <div className="text-gray-400">未答题</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Waiting State */}
        {!currentQuestion && !showQuestionForm && gameStats.status === 'waiting' && (
          <div className="glass rounded-3xl p-12 text-center animate-scale-in">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">准备就绪</h3>
            <p className="text-gray-400 text-lg">点击"发布新题目"开始游戏或进入下一轮</p>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="glass rounded-2xl p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-yellow-400">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-medium text-lg">{message}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 