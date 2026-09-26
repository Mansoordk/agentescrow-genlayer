"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatAmount, getTask, shortAddress, waitForTaskState, writeContract } from "../../lib/escrow";
import { useWallet } from "../../components/WalletProvider";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { account } = useWallet();
  const [task, setTask] = useState(null);
  const [resultUrl, setResultUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try { setTask(await getTask(id)); } catch (e) { setMessage(e?.message || "Unable to load this job."); }
  }
  useEffect(() => { if (id) load(); }, [id]);

  async function act(fn, args, statuses, success) {
    if (!account) return setMessage("Connect your wallet first.");
    setBusy(true); setMessage("Submitting transaction…");
    try { await writeContract(account, fn, args); const updated = await waitForTaskState(id, statuses, 300000); setTask(updated); setMessage(success); } catch (e) { setMessage(e?.message || "Transaction failed."); } finally { setBusy(false); }
  }

  async function accept() { await act("accept_task", [Number(id)], ["ACCEPTED"], "Job accepted. You are now the assigned agent."); }
  async function submit(e) { e.preventDefault(); if (!resultUrl.trim()) return setMessage("Result URL is required."); setBusy(true); setMessage("Submitting result…"); try { await writeContract(account, "submit_result", [Number(id), resultUrl.trim()]); const updated = await waitForTaskState(id, ["SUBMITTED"]); setTask(updated); setResultUrl(""); setMessage("Result submitted. The creator can now run GenLayer evaluation."); } catch (e) { setMessage(e?.message || "Failed to submit result."); } finally { setBusy(false); } }
  async function evaluate() { await act("evaluate_task", [Number(id)], ["PAID", "REFUNDED", "DISPUTED"], "GenLayer evaluation completed."); }
  async function settle() { await act("settle_dispute", [Number(id)], ["DISPUTE_SETTLED"], "Dispute settled 50/50."); }

  if (!task) return <main className="mx-auto max-w-5xl px-5 py-16 md:px-8"><Link href="/jobs" className="text-sm font-bold text-cyan-400">← Back to jobs</Link><div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-10 text-slate-400">{message || "Loading job…"}</div></main>;

  const status = String(task.status);
  const isAssignedAgent = account && String(task.agent).toLowerCase() === account.toLowerCase();
  const isCreator = account && String(task.creator).toLowerCase() === account.toLowerCase();
  const completed = ["PAID", "REFUNDED", "DISPUTED", "DISPUTE_SETTLED"].includes(status);

  return <main className="mx-auto max-w-5xl px-5 py-12 md:px-8">
    <Link href="/jobs" className="text-sm font-bold text-cyan-400">← Back to discovery</Link>
    <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">JOB #{String(task.id)}</p><h1 className="mt-2 text-4xl font-black">{String(task.title)}</h1></div><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300">{status}</span></div>
    <div className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs text-slate-500">ESCROW</p><p className="mt-2 text-3xl font-black">{formatAmount(task.amount)} GEN</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs text-slate-500">SCORE</p><p className="mt-2 text-3xl font-black">{String(task.score)}<span className="text-base text-slate-500"> / 100</span></p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-xs text-slate-500">VERDICT</p><p className="mt-2 text-3xl font-black">{String(task.verdict || "Pending")}</p></div></div>
    <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Requirements</p><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{String(task.requirements)}</p><div className="mt-7 grid gap-4 border-t border-slate-800 pt-6 md:grid-cols-2"><div><p className="text-xs text-slate-500">CREATOR</p><p className="mt-1 break-all font-semibold">{shortAddress(task.creator)}</p></div><div><p className="text-xs text-slate-500">ASSIGNED AGENT</p><p className="mt-1 break-all font-semibold">{shortAddress(task.agent)}</p></div></div></section>
    {task.result_url && <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Submitted result</p><a href={String(task.result_url)} target="_blank" rel="noreferrer" className="mt-4 block break-all text-cyan-300 underline">{String(task.result_url)}</a></section>}
    {message && <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">{message}</div>}

    <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Case actions</p>
      {status === "OPEN" && !isCreator && <button onClick={accept} disabled={busy} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-50">Accept this job →</button>}
      {status === "OPEN" && isCreator && <p className="mt-4 text-slate-400">This is your job. Another wallet must accept it.</p>}
      {status === "ACCEPTED" && isAssignedAgent && <form onSubmit={submit} className="mt-5 flex flex-col gap-3 md:flex-row"><input value={resultUrl} onChange={e => setResultUrl(e.target.value)} placeholder="https://your-result-url.com" className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" /><button disabled={busy} className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-50">Submit result →</button></form>}
      {status === "ACCEPTED" && !isAssignedAgent && <p className="mt-4 text-slate-400">The assigned agent must submit the result.</p>}
      {status === "SUBMITTED" && <button onClick={evaluate} disabled={busy || !isCreator} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-50">{busy ? "Evaluating…" : "Run GenLayer evaluation →"}</button>}
      {status === "SUBMITTED" && !isCreator && <p className="mt-3 text-sm text-slate-500">Only the creator can trigger evaluation.</p>}
      {status === "DISPUTED" && <button onClick={settle} disabled={busy} className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-slate-950 disabled:opacity-50">Settle 50/50 dispute →</button>}
      {completed && <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5"><p className="font-bold">Verification data</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{String(task.explanation || "No explanation stored.")}</p></div>}
    </section>

    <div className="mt-6 flex gap-3"><button onClick={load} disabled={busy} className="rounded-xl border border-slate-700 px-5 py-3 font-bold hover:bg-slate-900">Refresh case</button>{completed && <button onClick={() => router.push("/explorer")} className="rounded-xl border border-slate-700 px-5 py-3 font-bold hover:bg-slate-900">View explorer →</button>}</div>
  </main>;
}
