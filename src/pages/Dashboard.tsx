import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db'
import Welcome from '../components/Welcome'
import { sek } from '../types'

const COLORS = ['#0f766e', '#d97706', '#4f46e5', '#be123c', '#65a30d', '#0891b2', '#9333ea', '#ca8a04', '#475569', '#94a3b8']
const ore = (v: unknown) => sek(Number(v))

// Tooltip styling that follows the app's light/dark colors.
const tip = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--fg)' },
  labelStyle: { color: 'var(--fg)', fontWeight: 600 },
  itemStyle: { color: 'var(--fg)' },
  cursor: { fill: 'var(--line)', opacity: 0.5 },
}

export default function Dashboard() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const all = useLiveQuery(() => db.items.toArray(), [])

  const items = useMemo(
    () => (all ?? []).filter(i => (!from || i.purchasedAt >= from) && (!to || i.purchasedAt <= to)),
    [all, from, to])

  const group = (key: (i: (typeof items)[number]) => string) => {
    const m = new Map<string, number>()
    items.forEach(i => m.set(key(i), (m.get(key(i)) ?? 0) + i.netTotal))
    return [...m].map(([name, value]) => ({ name, value }))
  }
  const byCategory = group(i => i.category).sort((a, b) => b.value - a.value)
  const topItems = group(i => i.cleanName).sort((a, b) => b.value - a.value).slice(0, 15)
  const byMonth = group(i => i.purchasedAt.slice(0, 7)).sort((a, b) => a.name.localeCompare(b.name))
  const total = items.reduce((s, i) => s + i.netTotal, 0)

  if (!all) return null
  if (!all.length) return <Welcome />

  return (
    <section>
      <div className="row">
        <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <strong className="total">{sek(total)} spent</strong>
      </div>

      <h2>Spend by category</h2>
      <div className="split">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110}>
              {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={ore} {...tip} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="legend">
          {byCategory.map((c, i) => (
            <li key={c.name}><i style={{ background: COLORS[i % COLORS.length] }} />{c.name}
              <span>{sek(c.value)} · {Math.round((c.value / total) * 100)}%</span></li>
          ))}
        </ul>
      </div>

      <h2>Top items</h2>
      <ResponsiveContainer width="100%" height={Math.max(200, topItems.length * 28)}>
        <BarChart data={topItems} layout="vertical" margin={{ left: 90 }}>
          <XAxis type="number" tickFormatter={v => `${Math.round(v / 100)} kr`} />
          <YAxis type="category" dataKey="name" width={90} />
          <Tooltip formatter={ore} {...tip} />
          <Bar dataKey="value" name="Spent" fill="#0f766e" />
        </BarChart>
      </ResponsiveContainer>

      <h2>Spend per month</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={byMonth}>
          <XAxis dataKey="name" />
          <YAxis tickFormatter={v => `${Math.round(v / 100)}`} />
          <Tooltip formatter={ore} {...tip} />
          <Bar dataKey="value" name="Spent" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}