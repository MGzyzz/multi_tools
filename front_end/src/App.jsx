import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import { isAuthenticated, authLogout } from './api/authAPI'
import './index.css'

const Home = lazy(() => import('./components/Home/Home'))
const Attendance = lazy(() => import('./components/Attendance/Attendance'))
const Tools = lazy(() => import('./components/Tools/Tools'))
const Auth = lazy(() => import('./components/Auth/Auth'))
const GroupManagement = lazy(() => import('./components/GroupManagement/GroupManagement'))
const TeacherProfile = lazy(() => import('./components/TeacherProfile/TeacherProfile'))
const Analytics = lazy(() => import('./components/Analytics/Analytics'))

function ProtectedRoute({ authenticated, children }) {
  if (!authenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

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
    if (path.startsWith('/teacher-profile')) return 'profile'
    return 'home'
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
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
            <ProtectedRoute authenticated={authenticated}>
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
          path="/groups"
          element={
            <ProtectedRoute authenticated={authenticated}>
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
          path="/attendance/scan/:scheduleId"
          element={
            <ProtectedRoute authenticated={authenticated}>
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
            <ProtectedRoute authenticated={authenticated}>
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
            <ProtectedRoute authenticated={authenticated}>
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
          path="/teacher-profile"
          element={
            <ProtectedRoute authenticated={authenticated}>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <TeacherProfile isDark={theme === 'dark'} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute authenticated={authenticated}>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <Analytics isDark={theme === 'dark'} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute authenticated={authenticated}>
              <Layout 
                currentPage={getCurrentPage()} 
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                onNavigate={(path) => navigate(path)}
              >
                <div className="p-8 flex items-center justify-center min-h-[60vh] text-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Настройки</h1>
                    <p className="text-gray-400 mt-4">Страница в разработке...</p>
                  </div>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </div>
  )
}

export default App
