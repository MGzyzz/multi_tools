import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './components/Home/Home'
import Attendance from './components/Attendance/Attendance'
import AttendanceScanning from './components/Attendance/Attendance'
import Tools from './components/Tools/Tools'
import Auth from './components/Auth/Auth'
import GroupManagement from './components/GroupManagement/GroupManagement'
import { isAuthenticated, authLogout } from './api/authAPI'
import './index.css'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleLogin = (userData) => {
    setAuthenticated(true)
    navigate('/')
  }

  const handleLogout = () => {
    authLogout()
    setAuthenticated(false)
    navigate('/login')
  }

  const getCurrentPage = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/attendance')) return 'attendance'
    if (path.startsWith('/tools')) return 'tools'
    if (path.startsWith('/analytics')) return 'analytics'
    if (path.startsWith('/settings')) return 'settings'
    return 'home'
  }

  const ProtectedRoute = ({ children }) => {
    if (!authenticated) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  return (
    <div className="min-h-screen">
      <Routes>
        <Route 
          path="/login" 
          element={
            authenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Auth onLogin={handleLogin} theme={theme} setTheme={setTheme} />
            )
          } 
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <Home isDark={theme === 'dark'} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <GroupManagement isDark={theme === 'dark'}/>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <Attendance isDark={theme === 'dark'}/>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance/:scheduleId"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage="attendance" 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <Attendance />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <Tools isDark={theme === 'dark'} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white">Аналитика</h1>
                  <p className="text-gray-400 mt-4">Страница в разработке...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white">Настройки</h1>
                  <p className="text-gray-400 mt-4">Страница в разработке...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App