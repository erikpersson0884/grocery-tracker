import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAll, importAll } from '../db'
import { sek } from '../types'

export default function Receipts() {
  const receipts = useLiveQuery(() => db.receipts.orderBy('purchasedAt').reverse().toArray(), [])
  const [open, setOpen] = useState<number | null>(null)
  const items = useLiveQuery(() => (open ? db.items.where('receiptId').equals(open).toArray() : []), [open])
  const fileRef = useRef<HTMLInputElement>(null)

  async function remove(id: number) {
    if (!confirm('Delete this receipt?')) return
    await db.transaction('rw', db.receipts, db.items, async () => {
      await db.items.where('receiptId').equals(id).delete()
      await db.receipts.delete(id)
    })
    setOpen(null)
  }
  async function doExport() {
    const url = URL.createObjectURL(new Blob([await exportAll()], { type: 'application/json' }))
    Object.assign(document.createElement('a'), { href: url, download: 'grocery-backup.json' }).click()
    URL.revokeObjectURL(url)
  }
  async function doImport(f: File) {
    if (confirm('Importing replaces all current data. Continue?')) await importAll(await f.text())
  }

  return (
    <section>
      <div className="row">
        <h2>Receipts</h2>
        <button onClick={doExport}>Export backup</button>
        <button onClick={() => fileRef.current?.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept="application/json" hidden
          onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
      </div>
      {receipts?.length === 0 && <p className="empty">Nothing saved yet.</p>}
      {receipts?.map(r => (
        <div key={r.id} className="receipt">
          <button className="ghost head" onClick={() => setOpen(open === r.id ? null : r.id!)}>
            <span>{r.purchasedAt}</span><span>{r.store}</span><strong>{sek(r.total)}</strong>
          </button>
          {open === r.id && (
            <>
              <table>
                <tbody>
                  {items?.map(i => (
                    <tr key={i.id}><td>{i.cleanName}</td><td>{i.qty}×</td><td>{i.category}</td>
                      <td className="num">{sek(i.netTotal)}</td></tr>
                  ))}
                </tbody>
              </table>
              <button className="ghost danger" onClick={() => remove(r.id!)}>Delete receipt</button>
            </>
          )}
        </div>
      ))}
    </section>
  )
}
