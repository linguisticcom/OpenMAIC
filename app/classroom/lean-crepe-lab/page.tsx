'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

const symbols = ['Customer order', 'Information flow', 'Process step', 'Operator', 'Inventory', 'Queue / wait', 'Transport', 'Check / decision', 'Defect / rework', 'Supplier / resources', 'Crepe delivered'];

export default function LeanCrepeLab() {
  const [seconds, setSeconds] = useState(420);
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(1);
  const [map, setMap] = useState<string[]>(['Customer order', 'Crepe delivered']);
  const [keep, setKeep] = useState('');
  const [drop, setDrop] = useState('');
  const [start, setStart] = useState('');
  const active = running && seconds > 0;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const toggle = () => { if (!seconds) setSeconds(420); setRunning(value => !value || seconds === 0); };
  const reset = () => { setSeconds(420); setRunning(false); };
  const move = (index: number, offset: number) => setMap(items => {
    const target = index + offset;
    if (target < 0 || target >= items.length) return items;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const count = new Set(map).size;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return <main className="min-h-screen bg-sky-50 px-4 py-7 text-slate-900 sm:px-6 lg:px-8 lg:py-10"><div className="mx-auto max-w-7xl">
    <header className="border-b border-blue-200 pb-7"><div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" />LAN70 Lean Thinking <span className="text-blue-300">/</span> Group activity</div><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Crepe Truck Flow Lab</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">In groups of five or more, map the two-operator crepe truck from the customer order back to the resources. Make the flow, handoffs, waiting, and rework visible.</p></header>

    <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"><div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800">Seven-minute sprint · Iteration {iteration}</div><div className="p-5"><p className="font-mono text-6xl font-bold tracking-tight text-slate-950">{clock}</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={toggle} className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{active ? <Pause size={16} /> : <Play size={16} />}{active ? 'Pause' : 'Start'}</button><button aria-label="Reset timer" onClick={reset} className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-slate-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><RotateCcw className="mx-auto" size={17} /></button></div></div></section>
      <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Team roles</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>Customer / Product Champion</li><li>Mapper</li><li>Waste spotter</li><li>Timekeeper</li><li>Presenter</li></ul></section>
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h2 className="font-semibold text-blue-950">Facilitator loop</h2><ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700"><li>1. Start the timebox.</li><li>2. Collect the increment.</li><li>3. Review as the customer.</li><li>4. Retro, then repeat 3–4 times.</li></ol></section>
    </aside><section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-blue-100 pb-5"><div><p className="text-sm font-semibold text-blue-700">Build the map</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Customer order ← resources</h2></div><div className={`rounded-lg border px-4 py-2 text-center ${count === 11 ? 'border-blue-300 bg-blue-100 text-blue-950' : 'border-blue-200 bg-sky-50 text-slate-800'}`}><b>{count}/11 symbols</b><p className="text-xs">{count === 11 ? 'Ready for review' : 'Use every symbol once'}</p></div></div>
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]"><div><p className="mb-3 text-sm font-semibold text-slate-700">Symbol drawer</p><div className="space-y-2">{symbols.map(symbol => <button key={symbol} onClick={() => setMap(items => [...items, symbol])} className="w-full rounded-lg border border-blue-200 bg-white p-2.5 text-left text-sm font-medium text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">+ {symbol}</button>)}</div></div><div className="min-h-[430px] rounded-xl border border-dashed border-blue-300 bg-sky-50/70 p-4"><p className="text-sm font-semibold text-blue-950">Your process flow</p><div className="mt-4 space-y-2">{map.map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white p-3 shadow-sm"><span className="text-xs font-bold text-blue-700">{String(index + 1).padStart(2, '0')}</span><b className="flex-1 text-sm text-slate-900">{item}</b><button aria-label={`Move ${item} earlier`} disabled={!index} onClick={() => move(index, -1)} className="rounded-md border border-blue-200 px-2 py-1 text-sm text-blue-800 transition hover:bg-blue-50 disabled:opacity-30">←</button><button aria-label={`Move ${item} later`} disabled={index === map.length - 1} onClick={() => move(index, 1)} className="rounded-md border border-blue-200 px-2 py-1 text-sm text-blue-800 transition hover:bg-blue-50 disabled:opacity-30">→</button></div>)}</div></div></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2"><section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="text-sm font-semibold text-blue-950">Product Champion review</p><p className="mt-2 text-sm leading-6 text-slate-700">Is the customer order clear? Are all 11 symbols used? Can every caption be read? Where is the bottleneck, wait, or defect?</p><div className="mt-4 flex gap-2">{[1, 2, 3].map(number => <button key={number} onClick={() => setIteration(number)} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${iteration === number ? 'border-blue-700 bg-blue-700 text-white' : 'border-blue-200 bg-white text-blue-800 hover:bg-blue-100'}`}>Iteration {number}</button>)}</div></section><section className="rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="text-sm font-semibold text-blue-950">Two-minute retrospective</p><div className="mt-3 space-y-2"><input value={keep} onChange={event => setKeep(event.target.value)} placeholder="KEEP — what worked?" className="w-full rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" /><input value={drop} onChange={event => setDrop(event.target.value)} placeholder="DROP — what to stop?" className="w-full rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" /><input value={start} onChange={event => setStart(event.target.value)} placeholder="PICK UP — next experiment" className="w-full rounded-lg border border-blue-200 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div></section></div>
    </section></div><footer className="mt-8 border-t border-blue-200 pt-5 text-sm text-slate-600">Learning points: timeboxing · clarification · scope · shared ownership · continuous improvement · Definition of Done.</footer>
  </div></main>;
}
