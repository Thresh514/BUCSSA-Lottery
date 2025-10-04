"use client";

import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
      <div className="min-h-screen flex flex-col">
        {/* 返回首页 */}
        <div className="p-4">
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

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8 text-2xl font-bold">登录</div>

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
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
