import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "头号玩家 | Ready Player One",
  description: "开放沙盒世界 - 你的 Agent 在这里为生存而战",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
