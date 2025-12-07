import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/integrations/supabase/types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  allowPending?: boolean
}

export function ProtectedRoute({ children, allowedRoles, allowPending = false }: ProtectedRouteProps) {
  const { user, role, isLoading, profile } = useAuth()
  const location = useLocation()

  console.log('ProtectedRoute state:', { user: !!user, role, isLoading, profile, status: profile?.status })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Aguardar profile carregar se user existe mas role ainda não está disponível
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Verificar status do usuário
  if (profile?.status === 'pending' && !allowPending) {
    return <Navigate to="/pending-approval" replace />
  }

  if (profile?.status === 'blocked') {
    return <Navigate to="/blocked" replace />
  }

  if (profile?.status === 'inactive') {
    return <Navigate to="/blocked" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
