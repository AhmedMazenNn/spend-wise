import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Home from './pages/Dashboard/Home'
import Report from './pages/Dashboard/Report'
import Transactions from './pages/Dashboard/Transactions'
import Settings from './pages/Dashboard/Settings'
import Admin from './pages/Dashboard/Admin'

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/transcations" element={<Transactions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App

const Root = () => {
  //check if token exists in local storage
  const isAuthenticated = !!localStorage.getItem('token')

  //redirect to dashboard if authenticated, otherwise redirect to login
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
}