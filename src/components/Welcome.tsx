import { Link } from 'react-router-dom'

const STEPS = [
  ['Add your receipts', 'Upload one or many Willys receipt PDFs at once. Items, prices, discounts and deposits are read automatically.'],
  ['Check the result', 'Totals are verified against the receipt. Fix any category once and the app remembers it.'],
  ['See where the money goes', 'Spending by category, your most expensive items, how often you buy things, and monthly trends.'],
]

export default function Welcome() {
  return (
    <section className="welcome">
      <img src="/favicon.svg" alt="" width="72" height="72" />
      <h2>See where your grocery money goes</h2>
      <p className="lead">
        Upload your Willys receipts and get a clear picture of what you spend on, from
        categories like dairy and snacks down to single products.
      </p>

      <ol className="steps">
        {STEPS.map(([title, text], i) => (
          <li key={title}>
            <span className="badge">{i + 1}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <div className="actions">
        <Link to="/upload" className="btn primary">Add your first receipt</Link>
        <Link to="/receipts" className="btn">Import a backup</Link>
      </div>

      <p className="note">
        Private by design: receipts are read in your browser and nothing is sent to a server.
        The PDF itself isn't kept, and card and loyalty numbers are ignored. Your data is stored
        in this browser only, so export a backup from the Receipts page now and then.
        Currently works with Willys receipts in PDF format.
      </p>
    </section>
  )
}