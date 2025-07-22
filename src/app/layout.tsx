import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'BUCSSA 活动抽奖',
  description: '基于 Next.js 的高并发答题抽奖系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
