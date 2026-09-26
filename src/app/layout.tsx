import type { Metadata } from "next";
import { Public_Sans, Big_Shoulders } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "YourPlatform",
  description: "VOD + live video, without burying small creators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${bigShoulders.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-ink-950 text-paper-100">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
