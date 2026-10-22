import Dexie, { Table } from 'dexie'
import type { CategoryRule, Item, Receipt } from './types'

class AppDB extends Dexie {
  receipts!: Table<Receipt, number>
  items!: Table<Item, number>
  rules!: Table<CategoryRule, string>
  constructor() {
    super('grocery-tracker')
    this.version(1).stores({
      receipts: '++id, purchasedAt, fileHash',
      items: '++id, receiptId, category, purchasedAt',
      rules: 'key',
    })
  }
}
export const db = new AppDB()

export async function exportAll() {
  return JSON.stringify({
    receipts: await db.receipts.toArray(),
    items: await db.items.toArray(),
    rules: await db.rules.toArray(),
  })
}
export async function importAll(json: string) {
  const d = JSON.parse(json)
  await db.transaction('rw', db.receipts, db.items, db.rules, async () => {
    await db.receipts.clear(); await db.items.clear(); await db.rules.clear()
    await db.receipts.bulkAdd(d.receipts)
    await db.items.bulkAdd(d.items)
    await db.rules.bulkAdd(d.rules)
  })
}
