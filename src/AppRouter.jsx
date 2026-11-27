import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import RequireRole from './auth/RequireRole'
import PublicHome from './pages/PublicHome'
import StaffHome from './pages/StaffHome'
import FollowupPage from './pages/FollowupPage'
import RobotDev from './App'   // tu robot actual, sin tocar

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/seguimiento/:token" element={<FollowupPage />} />
          <Route path="/app/*" element={<RequireRole><StaffHome /></RequireRole>} />
          <Route path="/dev/robot" element={<RobotDev />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}