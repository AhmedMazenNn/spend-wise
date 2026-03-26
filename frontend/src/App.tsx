import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import { VerifyEmailPending } from './pages/Auth/VerifyEmailPending'
import { VerifyEmailResult } from './pages/Auth/VerifyEmailResult'
import Home from './pages/Dashboard/Home'
import { Report } from './pages/Dashboard/Report'
import Transactions from './pages/Dashboard/Transactions'
import { RequireAuth } from './components/RequireAuth'
import { Settings } from './pages/Dashboard/Settings'
import { Admin } from './pages/Dashboard/Admin'
import { CategoryBudgetsPage } from './pages/Dashboard/CategoryBudgets'
import { RequireAdmin } from './components/RequireAdmin'
import { NotFound } from './pages/NotFound'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import IncomePage from './pages/Dashboard/Income'

const App = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    const lang = i18n.language
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [i18n.language])

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public auth routes */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Email verification pages (public — no auth needed) */}
            <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
            <Route path="/verify-email" element={<VerifyEmailResult />} />

            {/* Protected Routes */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Home />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/report" element={<Report />} />
              <Route path="/category-budgets" element={<CategoryBudgetsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App