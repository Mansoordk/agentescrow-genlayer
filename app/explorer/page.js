"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAllTasks, formatAmount, shortAddress } from "../lib/escrow";

export default function ExplorerPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() { setLoading(true); setError(""); try { setTasks(await getAllTasks()); } catch (e) { setError(e?.message || "Unable to load reviewed cases."); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  const cases = useMemo(() => tasks.filter(t => ["PAID", "REFUNDED", "DISPUTED", "DISPUTE_SETTLED"].includes(String(t.status))).filter(t => filter === "ALL" || String(t.status) === filter), [tasks, filter]);

  return <main className="mx-auto max-w-7xl px-5 py-12 md:px-8"><div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">03 · VERIFICATION</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Reviewed cases</h1><p className="mt-4 max-w-2xl text-slate-400">Inspect completed evaluations, verdicts, scores, explanations, and escrow outcomes.</p></div><button onClick={load} className="w-fit rounded-xl border border-slate-700 px-5 py-3 font-bold hover:bg-slate-800">Refresh explorer</button></div>
    <div className="mt-9 flex flex-wrap gap-2">{[["ALL","All reviewed"],["PAID","Passed / paid"],["REFUNDED","Failed / refunded"],["DISPUTED","Disputed"],["DISPUTE_SETTLED","Settled disputes"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400 hover:bg-slate-900"}`}>{label}</button>)}</div>
    {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {loading ? <div className="py-20 text-center text-slate-500">Loading reviewed cases…</div> : cases.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-12 text-center"><h2 className="text-xl font-bold">No reviewed cases yet</h2><p className="mt-2 text-slate-500">Completed GenLayer evaluations will appear here.</p></div> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{cases.map(task => <Link key={String(task.id)} href={`/jobs/${String(task.id)}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400/50"><div className="flex items-start justify-between gap-3"><span className="text-xs font-bold text-slate-500">CASE #{String(task.id)}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold">{String(task.status)}</span></div><h2 className="mt-5 text-xl font-bold">{String(task.title)}</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-950 p-4"><p className="text-xs text-slate-500">VERDICT</p><p className="mt-1 font-black">{String(task.verdict || "—")}</p></div><div className="rounded-xl bg-slate-950 p-4"><p className="text-xs text-slate-500">SCORE</p><p className="mt-1 font-black">{String(task.score)}/100</p></div></div><div className="mt-4 rounded-xl bg-slate-950 p-4"><p className="text-xs text-slate-500">ESCROW OUTCOME</p><p className="mt-1 font-bold">{formatAmount(task.amount)} GEN</p></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{String(task.explanation || "No explanation stored.")}</p><p className="mt-5 text-xs text-slate-500">Creator {shortAddress(task.creator)} · Agent {shortAddress(task.agent)}</p></Link>)}</div>}
  </main>;
}
