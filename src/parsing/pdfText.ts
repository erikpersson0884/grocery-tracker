import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** Rebuilds text lines from a PDF by clustering text fragments on their y position. */
export async function pdfToLines(file: File): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const out: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    const frags = (content.items as any[])
      .filter(i => typeof i.str === 'string' && i.str.trim() !== '')
      .map(i => ({ s: i.str as string, x: i.transform[4] as number, y: i.transform[5] as number }))
      .sort((a, b) => b.y - a.y || a.x - b.x)
    let line: typeof frags = []
    const flush = () => {
      if (line.length) out.push(line.sort((a, b) => a.x - b.x).map(f => f.s).join(' ').replace(/\s+/g, ' ').trim())
      line = []
    }
    for (const f of frags) {
      if (line.length && Math.abs(f.y - line[0].y) > 3) flush()
      line.push(f)
    }
    flush()
  }
  return out
}

export async function sha256(file: File): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
