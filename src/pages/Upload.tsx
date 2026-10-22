import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { categorize, normalizeName } from '../categorize'
import { pdfToLines, sha256 } from '../parsing/pdfText'
import { parseWillys, ParsedReceipt } from '../parsing/willys'
import { CATEGORIES, Category, sek } from '../types'

interface DraftItem {
  rawName: string; cleanName: string; category: Category; auto: Category
  qty: number; unitPrice: number; netTotal: number
}
interface Draft { parsed: ParsedReceipt; items: DraftItem[]; fileHash: string; store: string; date: string }

const tidy = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

export default function Upload() {
  const nav = useNavigate()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(file: File) {
    setError(''); setDraft(null); setBusy(true)
    try {
      if (file.type !== 'application/pdf') throw new Error('Please choose a PDF file.')
      const fileHash = await sha256(file)
      if (await db.receipts.where('fileHash').equals(fileHash).count())
        throw new Error('This receipt has already been added.')
      const parsed = parseWillys(await pdfToLines(file))
      const rules = new Map((await db.rules.toArray()).map(r => [r.key, r.category]))
      const items = parsed.items.map(i => {
        const guess = categorize(i.rawName, rules)
        return { ...i, cleanName: tidy(i.rawName), category: guess, auto: guess }
      })
      setDraft({ parsed, items, fileHash, store: parsed.store, date: parsed.purchasedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const patch = (idx: number, p: Partial<DraftItem>) =>
    setDraft(d => d && { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) })

  async function save() {
    if (!draft) return
    const total = draft.items.reduce((s, i) => s + i.netTotal, 0)
    await db.transaction('rw', db.receipts, db.items, db.rules, async () => {
      const receiptId = await db.receipts.add({
        store: draft.store, purchasedAt: draft.date, total, fileHash: draft.fileHash,
      })
      await db.items.bulkAdd(draft.items.map(i => ({
        receiptId, purchasedAt: draft.date, rawName: i.rawName, cleanName: i.cleanName,
        category: i.category, qty: i.qty, unitPrice: i.unitPrice, netTotal: i.netTotal,
      })))
      // Remember only categories the user changed.
      const changed = draft.items.filter(i => i.category !== i.auto)
      if (changed.length)
        await db.rules.bulkPut(changed.map(i => ({ key: normalizeName(i.rawName), category: i.category })))
    })
    nav('/')
  }

  const liveSum = draft ? draft.items.reduce((s, i) => s + i.netTotal, 0) : 0

  return (
    <section>
      <h2>Add a receipt</h2>
      <label className="drop">
        <input type="file" accept="application/pdf" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        {busy ? 'Reading receipt…' : 'Choose a Willys receipt PDF'}
      </label>
      {error && <p className="banner error">{error}</p>}
      {draft && (
        <>
          {draft.parsed.warnings.map((w, i) => <p key={i} className="banner warn">{w}</p>)}
          <div className="row">
            <label>Store <input value={draft.store} onChange={e => setDraft({ ...draft, store: e.target.value })} /></label>
            <label>Date <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
            <span className={liveSum === draft.parsed.total ? 'ok' : 'bad'}>
              Items {sek(liveSum)} / receipt {sek(draft.parsed.total)}
            </span>
          </div>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Net price</th><th>Category</th><th /></tr></thead>
            <tbody>
              {draft.items.map((it, i) => (
                <tr key={i}>
                  <td><input value={it.cleanName} onChange={e => patch(i, { cleanName: e.target.value })} />
                    <small>{it.rawName}</small></td>
                  <td>{it.qty}</td>
                  <td className="num">{sek(it.netTotal)}</td>
                  <td>
                    <select value={it.category} onChange={e => patch(i, { category: e.target.value as Category })}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td><button className="ghost" title="Remove row"
                    onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="primary" onClick={save}>Save receipt</button>
        </>
      )}
    </section>
  )
}
