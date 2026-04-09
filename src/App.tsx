import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/lib/AuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import Index from './pages/Index'
import Room from './pages/Room'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import History from './pages/History'
import Partner from './pages/Partner'
import PartnerInvite from './pages/PartnerInvite'
import Messages from './pages/Messages'
import Retrospective from './pages/Retrospective'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/convite/:token" element={<PartnerInvite />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/sala/:roomId" element={<Room />} />
            <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/meu-amor" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
            <Route path="/mensagens/:id" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/retrospectiva" element={<ProtectedRoute><Retrospective /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
