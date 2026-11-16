import type { Metadata } from "next";
import { SITE_URL, SITE_DESCRIPTION, publicMetadata } from "@/lib/seo";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ToastProvider from "@/components/ToastProvider";
import MotionProvider from "@/components/motion/MotionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...publicMetadata("Kids’ party activities", SITE_DESCRIPTION, "/"),
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Partiers | Kids’ party activities",
    template: "%s | Partiers",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <ToastProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
