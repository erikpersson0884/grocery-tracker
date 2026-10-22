// All money is stored as integer öre (1 SEK = 100) to avoid float errors.
export const CATEGORIES = [
  'Produce', 'Dairy', 'Meat & Veg-protein', 'Bakery', 'Snacks & Sweets',
  'Sauces & Pantry', 'Frozen', 'Drinks', 'Household', 'Other',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface Receipt {
  id?: number
  store: string
  purchasedAt: string // YYYY-MM-DD
  total: number
  fileHash: string
}
export interface Item {
  id?: number
  receiptId: number
  purchasedAt: string
  rawName: string
  cleanName: string
  category: Category
  qty: number
  unitPrice: number
  netTotal: number // after discounts
}
export interface CategoryRule { key: string; category: Category }

export const sek = (ore: number) =>
  (ore / 100).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })
