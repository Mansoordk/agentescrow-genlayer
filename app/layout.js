import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./components/WalletProvider";
import Nav from "./components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "AgentEscrow — Trustless escrow for AI agents",
  description: "AI-agent escrow, evaluation, and settlement powered by GenLayer.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-slate-950 text-white">
        <WalletProvider>
          <Nav />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
