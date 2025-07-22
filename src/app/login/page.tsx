'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        setStep('code');
      } else {
        throw new Error('发送验证码失败');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      if (res.ok) {
        window.location.href = '/play';
      } else {
        throw new Error('验证码错误');
      }
    } catch (error) {
      console.error('验证失败:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 返回首页 */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
          返回首页
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">缩圈抽奖</h1>
            <p className="text-gray-400">输入邮箱获取验证码</p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            {step === 'email' ? (
              <>
                {/* 邮箱输入 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入你的邮箱"
                    />
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    验证码有效期为5分钟
                  </p>
                </div>

                {/* 发送验证码按钮 */}
                <button
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className={`w-full bg-gradient-to-r from-[#28a7ff] to-[#0066ff] text-white rounded-lg px-4 py-3 font-medium transition-all duration-300 ${
                    loading || !email
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {loading ? '发送中...' : '发送验证码'}
                </button>
              </>
            ) : (
              <>
                {/* 验证码输入 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    验证码
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入6位验证码"
                    maxLength={6}
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                      验证码已发送至 {email}
                    </p>
                    <button
                      onClick={() => setStep('email')}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      更换邮箱
                    </button>
                  </div>
                </div>

                {/* 验证按钮 */}
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className={`w-full bg-gradient-to-r from-[#28a7ff] to-[#0066ff] text-white rounded-lg px-4 py-3 font-medium transition-all duration-300 ${
                    loading || code.length !== 6
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {loading ? '验证中...' : '开始答题'}
                </button>
              </>
            )}

            {/* 安全提示 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                安全登录 · 隐私保护
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 