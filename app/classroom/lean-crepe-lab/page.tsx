'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, TimerReset } from 'lucide-react';

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
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const toggle = () => { if (!seconds) setSeconds(420); setRunning(value => !value || seconds === 0); };
  const reset = () => { setSeconds(420); setRunning(false); };
  const move = (index: number, by: number) => setMap(items => {
    const target = index + by; if (target < 0 || target >= items.length) return items;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const unique = new Set(map).size;
  const stamp = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return <main className="min-h-screen bg-[#efe7d7] px-4 py-6 text-[#25251f] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="border-b-4 border-[#25251f] pb-5"><p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#b84130]">LAN70 Lean Thinking · Group activity</p><h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-6xl">Crepe Truck Flow Lab</h1><p className="mt-3 max-w-3xl leading-6">In groups of five or more, map the two-operator crepe truck from the customer order back to the resources. Make the flow, handoffs, waiting, and rework visible.</p></header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="space-y-5"><section className="border-2 border-[#25251f] bg-[#fffaf0] p-4 shadow-[5px_5px_0_#25251f]"><p className="font-mono text-xs font-bold uppercase tracking-widest text-[#b84130]">Seven-minute sprint · I{iteration}</p><p className="my-3 font-mono text-6xl font-black">{stamp}</p><div className="grid grid-cols-2 gap-2"><button onClick={toggle} className="flex items-center justify-center gap-2 bg-[#b84130] p-3 font-bold text-white">{active ? <Pause size={17} /> : <Play size={17} />}{active ? 'Pause' : 'Start'}</button><button onClick={reset} className="border-2 border-[#25251f] p-3 font-bold hover:bg-[#e6bc42]"><TimerReset className="mx-auto" size={18} /></button></div></section><section className="border-2 border-[#25251f] bg-[#172a31] p-4 text-[#fffaf0]"><b>Team roles</b><p className="mt-2 text-sm leading-6 text-[#d8ded6]">Customer / Product Champion<br />Mapper<br />Waste spotter<br />Timekeeper<br />Presenter</p></section><section className="border-2 border-[#25251f] bg-[#fffaf0] p-4"><b>Facilitator loop</b><ol className="mt-2 space-y-2 text-sm"><li>1. Start the timebox.</li><li>2. Collect the increment.</li><li>3. Review as the customer.</li><li>4. Retro, then repeat 3–4 times.</li></ol></section></aside>
        <section className="border-2 border-[#25251f] bg-[#fffaf0] p-5 shadow-[7px_7px_0_#25251f]"><div className="flex flex-wrap justify-between gap-3 border-b-2 border-[#25251f] pb-4"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-[#b84130]">Build the map</p><h2 className="text-2xl font-black">Customer order ← resources</h2></div><div className={`border-2 px-3 py-2 text-center ${unique === 11 ? 'border-[#25715f] bg-[#d8ecdf]' : 'border-[#25251f]'}`}><b>{unique}/11 symbols</b><p className="text-xs">{unique === 11 ? 'Ready for review' : 'Use every symbol once'}</p></div></div><div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]"><div><p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest">Symbol drawer</p><div className="space-y-2">{symbols.map(symbol => <button key={symbol} onClick={() => setMap(items => [...items, symbol])} className="w-full border-2 border-[#25251f] bg-white p-2 text-left text-sm font-bold hover:bg-[#e6bc42]">+ {symbol}</button>)}</div></div><div className="min-h-[430px] border-2 border-dashed border-[#817564] bg-[#fffdf6] p-4"><p className="font-mono text-xs font-bold uppercase tracking-widest">Your process flow</p><div className="mt-4 space-y-2">{map.map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-2 border-2 border-[#25251f] bg-white p-3"><span className="font-mono text-xs">{String(index + 1).padStart(2, '0')}</span><b className="flex-1 text-sm">{item}</b><button disabled={!index} onClick={() => move(index, -1)} className="border px-2 disabled:opacity-30">←</button><button disabled={index === map.length - 1} onClick={() => move(index, 1)} className="border px-2 disabled:opacity-30">→</button></div>)}</div></div></div><div className="mt-6 grid gap-5 md:grid-cols-2"><section className="bg-[#172a31] p-4 text-white"><p className="font-mono text-xs font-bold uppercase tracking-widest text-[#e6bc42]">Review</p><p className="mt-2 text-sm leading-6">As Product Champion, check: Is the customer order clear? Are all 11 symbols used? Can we read every caption? Where is the bottleneck, wait, or defect?</p><div className="mt-3 flex gap-2">{[1,2,3].map(n => <button key={n} onClick={() => setIteration(n)} className={`border px-3 py-1 font-mono ${iteration === n ? 'bg-[#e6bc42] text-black' : 'border-white'}`}>I{n}</button>)}</div></section><section className="bg-[#e6bc42] p-4"><p className="font-mono text-xs font-bold uppercase tracking-widest">Two-minute retrospective</p><div className="mt-3 space-y-2"><input value={keep} onChange={e => setKeep(e.target.value)} placeholder="KEEP — what worked?" className="w-full border-2 border-[#25251f] p-2 text-sm" /><input value={drop} onChange={e => setDrop(e.target.value)} placeholder="DROP — what to stop?" className="w-full border-2 border-[#25251f] p-2 text-sm" /><input value={start} onChange={e => setStart(e.target.value)} placeholder="PICK UP — next experiment" className="w-full border-2 border-[#25251f] p-2 text-sm" /></div></section></div></section>
      </div><footer className="mt-8 border-t-2 border-[#25251f] pt-4 text-sm">Learning points: timeboxing · clarification · scope · shared ownership · continuous improvement · Definition of Done.</footer>
    </div>
  </main>;
}
