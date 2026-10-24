import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { normalizeName } from '../categorize'
import { CATEGORIES, sek } from '../types'

interface Row {
  key: string; name: string; category: string
  times: number; units: number; total: number; avg: number; last: string
}
type SortKey = 'name' | 'category' | 'times' | 'units' | 'total' | 'avg' | 'last'

const COLUMNS: [SortKey, string, boolean][] = [
  ['name', 'Item', false], ['category', 'Category', false], ['times', 'Times bought', true],
  ['units', 'Units', true], ['total', 'Total spent', true], ['avg', 'Avg per unit', true], ['last', 'Last bought', false],
]

export default function Items() {
  const all = useLiveQuery(() => db.items.toArray(), [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'total', dir: -1 })

  const rows = useMemo(() => {
    const src = (all ?? [])
      .filter(i => (!from || i.purchasedAt >= from) && (!to || i.purchasedAt <= to))
      .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt)) // oldest first, so the newest name/category wins
    const m = new Map<string, { name: string; category: string; receipts: Set<number>; units: number; total: number; last: string }>()
    for (const i of src) {
      const key = normalizeName(i.rawName)
      const r = m.get(key) ?? { name: i.cleanName, category: i.category, receipts: new Set<number>(), units: 0, total: 0, last: '' }
      r.name = i.cleanName; r.category = i.category; r.last = i.purchasedAt
      r.receipts.add(i.receiptId); r.units += i.qty; r.total += i.netTotal
      m.set(key, r)
    }
    return [...m].map(([key, r]): Row => ({
      key, name: r.name, category: r.category, times: r.receipts.size,
      units: r.units, total: r.total, avg: r.units ? r.total / r.units : 0, last: r.last,
    }))
  }, [all, from, to])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter(r => (!cat || r.category === cat) && (!needle || r.name.toLowerCase().includes(needle)))
    const { key, dir } = sort
    return list.sort((a, b) => {
      const x = a[key], y = b[key]
      return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir
    })
  }, [rows, q, cat, sort])

  const clickSort = (key: SortKey, numeric: boolean) =>
    setSort(s => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: numeric ? -1 : 1 }))

  if (!all) return null
  if (!all.length) return <p className="empty">No receipts yet. Add one to see your items.</p>

  return (
    <section>
      <div className="row">
        <label>Search <input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. gurka" /></label>
        <label>Category{' '}
          <select value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">All</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <p>{shown.length} items, {sek(shown.reduce((s, r) => s + r.total, 0))} spent</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {COLUMNS.map(([key, label, numeric]) => (
                <th key={key} className={numeric ? 'num' : ''}
                  aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button className="ghost" onClick={() => clickSort(key, numeric)}>
                    {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.key}>
                <td>{r.name}</td><td>{r.category}</td>
                <td className="num">{r.times}</td><td className="num">{r.units}</td>
                <td className="num">{sek(r.total)}</td><td className="num">{sek(r.avg)}</td>
                <td>{r.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}