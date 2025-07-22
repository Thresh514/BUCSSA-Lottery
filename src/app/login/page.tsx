'use client';

import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/play' });
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
            <h1 className="text-3xl font-bold text-white mb-2">BUCSSA 活动抽奖</h1>
            <p className="text-gray-400">使用 BU 或 Gmail 账户登录</p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            {/* Google 登录按钮 */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center bg-white text-gray-800 rounded-lg px-4 py-3 font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 mb-4"
            >
              <Image
                src="/google.svg"
                alt="Google"
                width={20}
                height={20}
                className="mr-2"
              />
              使用 Google 账户登录
            </button>

            {/* 提示信息 */}
            <p className="text-sm text-gray-400 text-center mt-4">
              仅支持 BU.EDU 和 Gmail 邮箱登录
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
} 