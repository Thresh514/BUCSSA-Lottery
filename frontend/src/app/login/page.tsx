"use client";

import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, UserIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 检查登录状态并重定向
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.isAdmin) {
        console.log("👑 Admin user detected, redirecting to /admin");
        router.push("/admin");
      } else if (session.user.isDisplay) {
        console.log("📺 Display user detected, redirecting to /show");
        router.push("/show");
      } else {
        console.log("👤 Regular user detected, redirecting to /play");
        router.push("/play");
      }
    }
  }, [session, status, router]);

  const handleGoogleSignIn = async () => {
    await signIn("google");
  };

  const handleAzureADSignIn = async () => {
    await signIn("azure-ad");
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="h-screen flex flex-col justify-between p-4">
          <div className="items-start">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white"
              >
                <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
                返回首页
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="items-center max-w-md mx-auto border-4 border-white/60 rounded-3xl pt-16 pb-12 px-6 py-6"
          >
            <div className="flex mb-8 items-center justify-center gap-2">
              <UserIcon className="w-10 h-10" />
              <div className="text-center text-2xl font-bold">登录</div>
            </div>
            <div className="text-center">
              {/* Google 登录按钮 */}
              <Button
                onClick={handleGoogleSignIn}
                size="lg"
                className="w-full mb-6"
              >
                <Image
                  src="/google.svg"
                  alt="Google"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Google 登录
              </Button>

              <Button
                onClick={handleAzureADSignIn}
                size="lg"
                className="w-full mb-6"
              >
                <Image
                  src="/outlook.png"
                  alt="Azure"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Outlook 登录
              </Button>

              <div className="text-center text-sm text-gray-400">
                登录即表示您同意我们的{" "}
                <a href="/term" className="text-blue-600 underline">
                  《使用与参与条款》
                </a>
              </div>
            </div>
          </motion.div>

          <div className="items-center bg-white/70 border-2 border-white/90 rounded-lg p-3 backdrop-blur-sm shadow-lg">
            <div className="text-gray-800 text-sm text-center">
              💡 <strong>提示：</strong>如果登录后被踢出来，可能是游戏已开始或者管理员未重置，请耐心等候哦！
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
