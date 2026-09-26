"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTaskCount, waitForTaskState, writeContract } from "../lib/escrow";
import { useWallet } from "../components/WalletProvider";

export default function CreatePage() {
  const router = useRouter();
  const { account, connectWallet } = useWallet();
  const [title, setTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!account) return setMessage("Connect your wallet first.");
    if (title.trim().length < 3) return setMessage("Task title must be at least 3 characters.");
    if (requirements.trim().length < 10) return setMessage("Requirements must be at least 10 characters.");
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) return setMessage("Escrow must be a positive whole number of GEN.");

    setBusy(true);
    try {
      const id = await getTaskCount();
      setMessage(`Creating job #${id}…`);
      await writeContract(account, "create_task", [title.trim(), requirements.trim()], BigInt(parsed) * 10n ** 18n);
      await waitForTaskState(id, ["OPEN"]);
      router.push(`/jobs/${id}`);
    } catch (error) {
      setMessage(error?.message || "Failed to create job.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
    <div className="mb-10"><p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">01 · CREATE</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Post a new job</h1><p className="mt-4 max-w-2xl text-slate-400">Define exactly what the agent must deliver, then lock GEN into escrow. The requirements become the basis for GenLayer evaluation.</p></div>
    <form onSubmit={submit} className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
      <div><label className="text-sm font-bold text-slate-300">Job title</label><input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Research five Nigerian fintech companies" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" /></div>
      <div><label className="text-sm font-bold text-slate-300">Requirements</label><textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={9} placeholder="Describe the deliverable, acceptance criteria, URLs or evidence required…" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" /></div>
      <div className="max-w-xs"><label className="text-sm font-bold text-slate-300">Escrow amount (GEN)</label><input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" /></div>
      {message && <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">{message}</div>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="rounded-xl bg-cyan-400 px-6 py-3 font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Creating…" : "Create & lock GEN →"}</button>{!account && <button type="button" onClick={() => connectWallet().catch(e => setMessage(e.message))} className="rounded-xl border border-slate-700 px-6 py-3 font-bold hover:bg-slate-800">Connect wallet</button>}</div>
    </form>
  </main>;
}
