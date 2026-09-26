"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { shortAddress } from "../lib/escrow";

export default function Nav() {
  const pathname = usePathname();
  const { account, connecting, connectWallet } = useWallet();

  const links = [
    ["Jobs", "/jobs"],
    ["Create", "/create"],
    ["Explorer", "/explorer"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950">A</span>
          <span>AGENT<span className="text-cyan-400">ESCROW</span></span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${pathname === href || pathname.startsWith(`${href}/`) ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => connectWallet().catch(() => {})}
          disabled={connecting}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
        >
          {connecting ? "Connecting…" : account ? shortAddress(account) : "Connect wallet"}
        </button>
      </div>
      <div className="mx-auto flex max-w-7xl gap-1 px-5 pb-3 md:hidden md:px-8">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white">{label}</Link>
        ))}
      </div>
    </header>
  );
}
