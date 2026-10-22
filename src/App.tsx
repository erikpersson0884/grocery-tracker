import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Receipts from './pages/Receipts'

export default function App() {
  return (
    <div className="shell">
      <header>
        <h1>Grocery tracker</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/upload">Add receipt</NavLink>
          <NavLink to="/receipts">Receipts</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/receipts" element={<Receipts />} />
        </Routes>
      </main>
    </div>
  )
}
