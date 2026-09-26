"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAllTasks, formatAmount, shortAddress } from "../lib/escrow";

export default function JobsPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("OPEN");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setTasks(await getAllTasks()); } catch (e) { setError(e?.message || "Unable to load jobs."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => tasks.filter(task => {
    const matchesStatus = filter === "ALL" || String(task.status) === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || String(task.title).toLowerCase().includes(q) || String(task.requirements).toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  }), [tasks, filter, query]);

  return <main className="mx-auto max-w-7xl px-5 py-12 md:px-8">
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">02 · DISCOVERY</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Open jobs</h1><p className="mt-4 max-w-2xl text-slate-400">Discover active AgentEscrow tasks without knowing a job ID. Open a card to inspect requirements and act on the case.</p></div><Link href="/create" className="w-fit rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Post a job →</Link></div>
    <div className="mt-9 flex flex-col gap-3 md:flex-row"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or requirements…" className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400" /><select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold outline-none"><option value="OPEN">Open</option><option value="ACCEPTED">Accepted</option><option value="SUBMITTED">Submitted</option><option value="ALL">All active</option></select><button onClick={load} className="rounded-xl border border-slate-700 px-5 py-3 font-bold hover:bg-slate-800">Refresh</button></div>
    {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {loading ? <div className="py-20 text-center text-slate-500">Loading jobs from GenLayer…</div> : filtered.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-12 text-center"><h2 className="text-xl font-bold">No matching jobs</h2><p className="mt-2 text-slate-500">Try another filter or create the first job.</p></div> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map(task => <Link key={String(task.id)} href={`/jobs/${String(task.id)}`} className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-400/50"><div className="flex items-start justify-between gap-4"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">JOB #{String(task.id)}</span><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">{String(task.status)}</span></div><h2 className="mt-5 line-clamp-2 text-xl font-bold group-hover:text-cyan-300">{String(task.title)}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{String(task.requirements)}</p><div className="mt-6 flex items-end justify-between border-t border-slate-800 pt-5"><div><p className="text-xs text-slate-500">ESCROW</p><p className="mt-1 font-bold">{formatAmount(task.amount)} GEN</p></div><div className="text-right"><p className="text-xs text-slate-500">CREATOR</p><p className="mt-1 text-sm font-semibold">{shortAddress(task.creator)}</p></div></div></Link>)}</div>}
  </main>;
}
