import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Upload from './pages/Upload'
import Receipts from './pages/Receipts'

export default function App() {
  return (
    <div className="shell">
      <header>
        <h1>Grocery tracker</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/items">Items</NavLink>
          <NavLink to="/upload">Add receipt</NavLink>
          <NavLink to="/receipts">Receipts</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/receipts" element={<Receipts />} />
        </Routes>
      </main>
    </div>
  )
}