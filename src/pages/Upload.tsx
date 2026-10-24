import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { categorize, normalizeName } from '../categorize'
import { pdfToLines, sha256 } from '../parsing/pdfText'
import { parseWillys, ParsedReceipt } from '../parsing/willys'
import { CATEGORIES, Category, sek } from '../types'

interface DraftItem {
  rawName: string; cleanName: string; category: Category; auto: Category
  qty: number; unitPrice: number; netTotal: number
}
interface Draft {
  fileName: string; fileHash: string; parsed: ParsedReceipt
  items: DraftItem[]; store: string; date: string
}
interface Skipped { fileName: string; reason: string }

const tidy = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
const sumOf = (d: Draft) => d.items.reduce((s, i) => s + i.netTotal, 0)

export default function Upload() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [skipped, setSkipped] = useState<Skipped[]>([])
  const [progress, setProgress] = useState<string>('')
  const [saved, setSaved] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Warn before the tab is closed or reloaded with receipts that haven't been saved.
  useEffect(() => {
    if (!drafts.length) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [drafts.length])

  async function onFiles(files: File[]) {
    setSaved(0)
    const rules = new Map((await db.rules.toArray()).map(r => [r.key, r.category]))
    const seen = new Set(drafts.map(d => d.fileHash))
    const newDrafts: Draft[] = []
    const newSkipped: Skipped[] = []

    for (let n = 0; n < files.length; n++) {
      const file = files[n]
      setProgress(`Reading ${n + 1} of ${files.length}: ${file.name}`)
      try {
        if (file.type !== 'application/pdf') throw new Error('Not a PDF file.')
        const fileHash = await sha256(file)
        if (seen.has(fileHash)) throw new Error('Same file already in this batch.')
        if (await db.receipts.where('fileHash').equals(fileHash).count())
          throw new Error('Already added earlier.')
        const parsed = parseWillys(await pdfToLines(file))
        seen.add(fileHash)
        const items = parsed.items.map(i => {
          const guess = categorize(i.rawName, rules)
          return { ...i, cleanName: tidy(i.rawName), category: guess, auto: guess }
        })
        newDrafts.push({ fileName: file.name, fileHash, parsed, items, store: parsed.store, date: parsed.purchasedAt })
      } catch (e) {
        newSkipped.push({ fileName: file.name, reason: e instanceof Error ? e.message : String(e) })
      }
    }
    setProgress('')
    setDrafts(d => [...d, ...newDrafts].sort((a, b) => a.date.localeCompare(b.date)))
    setSkipped(s => [...s, ...newSkipped])
  }

  const updateDraft = (di: number, p: Partial<Draft>) =>
    setDrafts(ds => ds.map((d, i) => (i === di ? { ...d, ...p } : d)))
  const patchItem = (di: number, ii: number, p: Partial<DraftItem>) =>
    setDrafts(ds => ds.map((d, i) =>
      i === di ? { ...d, items: d.items.map((it, j) => (j === ii ? { ...it, ...p } : it)) } : d))

  async function saveAll() {
    setSaving(true); setSaveError('')
    try {
    await db.transaction('rw', db.receipts, db.items, db.rules, async () => {
      const changed: DraftItem[] = []
      for (const d of drafts) {
        const receiptId = await db.receipts.add({
          store: d.store, purchasedAt: d.date, total: sumOf(d), fileHash: d.fileHash,
        })
        await db.items.bulkAdd(d.items.map(i => ({
          receiptId, purchasedAt: d.date, rawName: i.rawName, cleanName: i.cleanName,
          category: i.category, qty: i.qty, unitPrice: i.unitPrice, netTotal: i.netTotal,
        })))
        changed.push(...d.items.filter(i => i.category !== i.auto))
      }
      // Remember only categories the user changed.
      if (changed.length)
        await db.rules.bulkPut(changed.map(i => ({ key: normalizeName(i.rawName), category: i.category })))
    })
    setSaved(drafts.length); setDrafts([]); setSkipped([])
    window.scrollTo({ top: 0 })
    } catch (e) {
      setSaveError(`Could not save: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setSaving(false) }
  }

  const withWarnings = drafts.filter(d => d.parsed.warnings.length || sumOf(d) !== d.parsed.total).length

  return (
    <section>
      <h2>Add receipts</h2>
      <label className="drop">
        <input type="file" accept="application/pdf" multiple
          onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; if (f.length) onFiles(f) }} />
        {progress || (drafts.length ? 'Add more receipt PDFs' : 'Choose one or more Willys receipt PDFs')}
      </label>

      {saved > 0 && drafts.length === 0 && (
        <p className="banner success">
          <strong>✓ Saved {saved} receipt{saved > 1 ? 's' : ''}.</strong>{' '}
          <Link to="/">View dashboard</Link> or add more above.
        </p>
      )}

      {drafts.length > 0 && (
        <p className="banner warn">
          <strong>Not saved yet.</strong> Check the receipts below, then press Save at the bottom of the screen.
        </p>
      )}

      {skipped.length > 0 && (
        <div className="banner error">
          <strong>Skipped {skipped.length} file{skipped.length > 1 ? 's' : ''}</strong>
          <ul>{skipped.map((s, i) => <li key={i}>{s.fileName}: {s.reason}</li>)}</ul>
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <p>
            {drafts.length} receipt{drafts.length > 1 ? 's' : ''} ready, {sek(drafts.reduce((s, d) => s + sumOf(d), 0))} in total.
            {withWarnings > 0 && <span className="bad"> {withWarnings} need a look (shown open below).</span>}
          </p>

          {drafts.map((d, di) => {
            const live = sumOf(d)
            const ok = d.parsed.warnings.length === 0 && live === d.parsed.total
            return (
              <details key={d.fileHash} className="receipt" open={!ok}>
                <summary className="head">
                  <span>{d.date}</span><span>{d.store}</span>
                  <span className={ok ? 'ok' : 'bad'}>{ok ? 'Totals match' : 'Check this one'}</span>
                  <strong>{sek(live)}</strong>
                </summary>
                {d.parsed.warnings.map((w, i) => <p key={i} className="banner warn">{w}</p>)}
                <div className="row">
                  <label>Store <input value={d.store} onChange={e => updateDraft(di, { store: e.target.value })} /></label>
                  <label>Date <input type="date" value={d.date} onChange={e => updateDraft(di, { date: e.target.value })} /></label>
                  <span className={live === d.parsed.total ? 'ok' : 'bad'}>
                    Items {sek(live)} / receipt {sek(d.parsed.total)}
                  </span>
                  <button className="ghost danger" onClick={() => setDrafts(ds => ds.filter((_, i) => i !== di))}>
                    Discard receipt
                  </button>
                </div>
                <table>
                  <thead><tr><th>Item</th><th>Qty</th><th>Net price</th><th>Category</th><th /></tr></thead>
                  <tbody>
                    {d.items.map((it, ii) => (
                      <tr key={ii}>
                        <td><input value={it.cleanName} onChange={e => patchItem(di, ii, { cleanName: e.target.value })} />
                          <small>{it.rawName}</small></td>
                        <td>{it.qty}</td>
                        <td className="num">{sek(it.netTotal)}</td>
                        <td>
                          <select value={it.category} onChange={e => patchItem(di, ii, { category: e.target.value as Category })}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td><button className="ghost" title="Remove row"
                          onClick={() => updateDraft(di, { items: d.items.filter((_, j) => j !== ii) })}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )
          })}
          {saveError && <p className="banner error">{saveError}</p>}
          <div className="savebar">
            <span>{drafts.length} receipt{drafts.length > 1 ? 's' : ''} ready · <strong>not saved yet</strong></span>
            <button className="primary" disabled={saving} onClick={saveAll}>
              {saving ? 'Saving…' : `Save ${drafts.length} receipt${drafts.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </section>
  )
}