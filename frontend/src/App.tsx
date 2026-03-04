import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Home from './pages/Dashboard/Home'
import { Report } from './pages/Dashboard/Report'
import Transactions from './pages/Dashboard/Transactions'
import { RequireAuth } from './components/RequireAuth'

import { Settings } from './pages/Dashboard/Settings'
import { Admin } from './pages/Dashboard/Admin'
import { RequireAdmin } from './components/RequireAdmin'
import { NotFound } from './pages/NotFound'

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
        {/* Protected Routes */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App