import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casa Verde — Bản thiết kế nhà vườn 3D · ArtCraft",
  description:
    "Bản thiết kế nhà 3D tương tác được render bằng engine Three.js và skybox cubemap lấy từ dự án mã nguồn mở ArtCraft (storytold/artcraft).",
  keywords: ["ArtCraft", "Three.js", "bản thiết kế nhà", "3D", "skybox", "kitbashing"],
  authors: [{ name: "ArtCraft Resources Demo" }],
  icons: {
    icon: "/artcraft/logo/artcraft-icon.png",
  },
  openGraph: {
    title: "Casa Verde — Bản thiết kế nhà vườn 3D",
    description: "Render từ tài nguyên dự án ArtCraft",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
