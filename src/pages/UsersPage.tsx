import { useEffect, useState } from 'react'
import { Search, MoreHorizontal, UserCheck, UserX, Shield, Building2, Clock, CheckCircle, XCircle, Ban } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import type { Profile, Franchise, UserStatus, UserRole } from '@/integrations/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UserWithFranchise extends Profile {
  franchise?: Franchise | null
}

const statusConfig: Record<UserStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pendente', variant: 'warning', icon: Clock },
  active: { label: 'Ativo', variant: 'success', icon: CheckCircle },
  blocked: { label: 'Bloqueado', variant: 'destructive', icon: Ban },
  inactive: { label: 'Inativo', variant: 'secondary', icon: XCircle },
}

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
  matriz: { label: 'Matriz', color: 'bg-blue-100 text-blue-800' },
  franqueado: { label: 'Franqueado', color: 'bg-green-100 text-green-800' },
}

export function UsersPage() {
  const { profile: currentUser } = useAuth()
  const [users, setUsers] = useState<UserWithFranchise[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      const { data: franchisesData, error: franchisesError } = await supabase
        .from('franchises')
        .select('*')

      if (franchisesError) throw franchisesError

      setFranchises(franchisesData as Franchise[])

      // Map franchises to users
      const usersWithFranchise = (usersData as Profile[]).map(user => ({
        ...user,
        franchise: (franchisesData as Franchise[]).find(f => f.id === user.franchise_id) || null,
      }))

      setUsers(usersWithFranchise)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        console.error('Supabase error:', error)
        alert(`Erro ao atualizar status: ${error.message}`)
        return
      }

      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Erro inesperado ao atualizar status')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        console.error('Supabase error:', error)
        alert(`Erro ao atualizar função: ${error.message}`)
        return
      }

      fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Erro inesperado ao atualizar função')
    }
  }

  const handleUpdateFranchise = async (userId: string, franchiseId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ franchise_id: franchiseId, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        console.error('Supabase error:', error)
        alert(`Erro ao atualizar franquia: ${error.message}`)
        return
      }

      fetchUsers()
    } catch (error) {
      console.error('Error updating user franchise:', error)
      alert('Erro inesperado ao atualizar franquia')
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const pendingCount = users.filter(u => u.status === 'pending').length
  const activeCount = users.filter(u => u.status === 'active').length
  const blockedCount = users.filter(u => u.status === 'blocked').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Aprove, bloqueie e gerencie os usuários do sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="matriz">Matriz</SelectItem>
                <SelectItem value="franqueado">Franqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Franquia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const statusInfo = statusConfig[user.status]
                  const roleInfo = roleConfig[user.role]
                  const StatusIcon = statusInfo.icon

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.franchise ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{user.franchise.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.id !== currentUser?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {user.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'active')}>
                                    <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                                    Aprovar Usuário
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'blocked')}>
                                    <UserX className="w-4 h-4 mr-2 text-red-600" />
                                    Rejeitar Usuário
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {user.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'blocked')}>
                                  <Ban className="w-4 h-4 mr-2 text-red-600" />
                                  Bloquear Usuário
                                </DropdownMenuItem>
                              )}
                              {(user.status === 'blocked' || user.status === 'inactive') && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'active')}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Ativar Usuário
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, 'franqueado')}
                                disabled={user.role === 'franqueado'}
                              >
                                Definir como Franqueado
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, 'matriz')}
                                disabled={user.role === 'matriz'}
                              >
                                Definir como Matriz
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(user.id, 'admin')}
                                disabled={user.role === 'admin'}
                              >
                                Definir como Admin
                              </DropdownMenuItem>
                              {user.role === 'franqueado' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="p-0">
                                    <Select
                                      value={user.franchise_id || 'none'}
                                      onValueChange={(value) => handleUpdateFranchise(user.id, value === 'none' ? null : value)}
                                    >
                                      <SelectTrigger className="border-0 shadow-none h-8 px-2">
                                        <SelectValue placeholder="Vincular Franquia" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sem Franquia</SelectItem>
                                        {franchises.map((franchise) => (
                                          <SelectItem key={franchise.id} value={franchise.id}>
                                            {franchise.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
