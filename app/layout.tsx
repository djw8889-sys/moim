import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "moim — 모임의 모든 것",
  description:
    "중간지점 찾기, 정산, 일정 투표, 사진 공유까지. 지인 모임을 위한 올인원 앱",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    title: "moim",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
        <RegisterSW />
      </body>
    </html>
  );
}
