"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import BackgroundImage from "@/components/game/BackgroundImage";
import { GlassText } from "@/components/ui/glass-text";
import { Box } from "@/components/ui/box";

export default function TermPage() {
  const router = useRouter();
  
  return (
    <>
      <div className="min-h-screen relative z-10">
        {/* 返回首页按钮 */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20"
          >
            <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
            返回首页
          </Button>
        </div>

        {/* 主要内容区域 */}
        <div className="flex min-h-screen items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-2xl space-y-8"
          >
            {/* 标题 */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">使用与参与条款</h1>
                <p className="text-sm">请仔细阅读以下条款，登录即表示您同意遵守</p>
            </div>

            {/* 条款内容 */}
              <div className="space-y-4 text-white/80 leading-relaxed">
                <div className="space-y-2">
                  <div className="font-semibold text-white">1. 服务说明</div>
                  <div className="text-sm pl-4">
                    本平台提供在线实时抽奖与淘汰类游戏服务，用户可通过 Google 账号或者 Outlook 账号登录参与。
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">2. 用户信息</div>
                  <div className="text-sm pl-4">
                    用户需确保所提供的登录信息真实有效，平台不会公开或出售个人信息。
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">3. 游戏规则</div>
                  <div className="text-sm pl-4">
                    游戏结果由系统自动判定与记录，不支持人工干预或结果修改。
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">4. 技术风险</div>
                  <div className="text-sm pl-4">
                    在游戏过程中若出现网络中断、浏览器关闭、系统更新等情况，可能导致自动退出或被视为弃权。
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">5. 公平游戏</div>
                  <div className="text-sm pl-4">
                    用户应遵守公平游戏原则，不得利用漏洞、脚本或其他方式干扰游戏运行。
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-white">6. 最终解释权</div>
                  <div className="text-sm pl-4">
                    BUCSSA 保留对系统维护、规则调整及活动终止的最终解释权。
                  </div>
                </div>
              </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}