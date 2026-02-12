import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mirifer - Smart Grooming Management",
  description: "The all-in-one CRM for solo pet groomers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mirifer",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7C9082",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192.jpg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.jpg" />
      </head>
      <body
        className={`${inter.className} antialiased bg-soft-white text-sage-800 min-h-screen overscroll-none`}
      >
        {children}
      </body>
    </html>
  );
}
