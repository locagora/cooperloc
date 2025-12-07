import { useEffect, useState } from 'react'
import { Package, Building2, Truck, AlertTriangle, CheckCircle2, Clock, Archive, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalTrackers: number
  trackersInStock: number
  trackersSent: number
  trackersInstalled: number
  trackersDefective: number
  totalFranchises: number
}

interface RecentMovement {
  id: string
  tracker_serial: string
  from_status: string
  to_status: string
  franchise_name: string | null
  created_at: string
}

export function DashboardPage() {
  const { profile, role } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalTrackers: 0,
    trackersInStock: 0,
    trackersSent: 0,
    trackersInstalled: 0,
    trackersDefective: 0,
    totalFranchises: 0,
  })
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [_isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)

      try {
        let trackersQuery = supabase.from('trackers').select('status', { count: 'exact' })

        if (role === 'franqueado' && profile?.franchise_id) {
          trackersQuery = trackersQuery.eq('franchise_id', profile.franchise_id)
        }

        const { data: trackers, count: totalTrackers } = await trackersQuery

        const statusCounts = {
          estoque: 0,
          enviado: 0,
          instalado: 0,
          defeito: 0,
        }

        trackers?.forEach((t: { status: string }) => {
          if (t.status in statusCounts) {
            statusCounts[t.status as keyof typeof statusCounts]++
          }
        })

        let franchiseCount = 0
        if (role !== 'franqueado') {
          const { count } = await supabase
            .from('franchises')
            .select('*', { count: 'exact', head: true })
            .eq('active', true)
          franchiseCount = count || 0
        }

        setStats({
          totalTrackers: totalTrackers || 0,
          trackersInStock: statusCounts.estoque,
          trackersSent: statusCounts.enviado,
          trackersInstalled: statusCounts.instalado,
          trackersDefective: statusCounts.defeito,
          totalFranchises: franchiseCount,
        })

        let movementsQuery = supabase
          .from('tracker_movements')
          .select(`
            id,
            from_status,
            to_status,
            created_at,
            trackers!inner(serial_number),
            franchises(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        const { data: movements } = await movementsQuery

        if (movements) {
          setRecentMovements(
            movements.map((m: any) => ({
              id: m.id,
              tracker_serial: m.trackers?.serial_number || 'N/A',
              from_status: m.from_status,
              to_status: m.to_status,
              franchise_name: m.franchises?.name || null,
              created_at: m.created_at,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [role, profile?.franchise_id])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'estoque':
        return 'Em Estoque'
      case 'enviado':
        return 'Enviado'
      case 'instalado':
        return 'Instalado'
      case 'defeito':
        return 'Defeito'
      default:
        return status
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'estoque':
        return <Badge className="bg-[#6B73FF]/10 text-[#6B73FF] border-[#6B73FF]/20">{getStatusLabel(status)}</Badge>
      case 'enviado':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{getStatusLabel(status)}</Badge>
      case 'instalado':
        return <Badge className="bg-[#4ADE80]/10 text-[#22c55e] border-[#4ADE80]/20">{getStatusLabel(status)}</Badge>
      case 'defeito':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">{getStatusLabel(status)}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFirstName = (fullName: string | null) => {
    if (!fullName) return 'Usuário'
    return fullName.split(' ')[0]
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Olá, {getFirstName(profile?.full_name ?? null)}!</h1>
        <p className="text-white/80 mt-1">
          {role === 'franqueado'
            ? 'Acompanhe os rastreadores da sua unidade'
            : 'Confira o resumo geral do sistema CooperLoc'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total de Rastreadores */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Rastreadores</p>
                <p className="text-3xl font-bold text-[#1E3A5F] mt-1">{stats.totalTrackers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {role === 'franqueado' ? 'Na sua unidade' : 'Em todo o sistema'}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center">
                <Package className="h-7 w-7 text-[#1E3A5F]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Em Estoque */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Estoque</p>
                <p className="text-3xl font-bold text-[#6B73FF] mt-1">{stats.trackersInStock}</p>
                <p className="text-xs text-muted-foreground mt-1">Disponíveis para envio</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-[#6B73FF]/10 flex items-center justify-center">
                <Archive className="h-7 w-7 text-[#6B73FF]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enviados */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enviados</p>
                <p className="text-3xl font-bold text-amber-500 mt-1">{stats.trackersSent}</p>
                <p className="text-xs text-muted-foreground mt-1">Aguardando instalação</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Truck className="h-7 w-7 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Franquias Ativas ou Instalados */}
        {role !== 'franqueado' ? (
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Franquias Ativas</p>
                  <p className="text-3xl font-bold text-[#4ADE80] mt-1">{stats.totalFranchises}</p>
                  <p className="text-xs text-muted-foreground mt-1">Unidades cadastradas</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-[#4ADE80]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instalados</p>
                  <p className="text-3xl font-bold text-[#4ADE80] mt-1">{stats.trackersInstalled}</p>
                  <p className="text-xs text-muted-foreground mt-1">Em operação</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-[#4ADE80]" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Overview & Recent Movements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resumo por Status */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[#1E3A5F]">Resumo por Status</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição dos rastreadores</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Em Estoque */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#6B73FF]" />
                  <span className="font-medium">Em Estoque</span>
                </div>
                <span className="font-semibold text-[#1E3A5F]">{stats.trackersInStock}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6B73FF] rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalTrackers > 0 ? (stats.trackersInStock / stats.totalTrackers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Enviados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium">Enviados</span>
                </div>
                <span className="font-semibold text-[#1E3A5F]">{stats.trackersSent}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalTrackers > 0 ? (stats.trackersSent / stats.totalTrackers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Instalados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#4ADE80]" />
                  <span className="font-medium">Instalados</span>
                </div>
                <span className="font-semibold text-[#1E3A5F]">{stats.trackersInstalled}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4ADE80] rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalTrackers > 0 ? (stats.trackersInstalled / stats.totalTrackers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Com Defeito */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="font-medium">Com Defeito</span>
                </div>
                <span className="font-semibold text-[#1E3A5F]">{stats.trackersDefective}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalTrackers > 0 ? (stats.trackersDefective / stats.totalTrackers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movimentações Recentes */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[#1E3A5F]">Movimentações Recentes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimas atualizações de rastreadores</p>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma movimentação recente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1E3A5F] truncate">{movement.tracker_serial}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(movement.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(movement.from_status)}
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {getStatusBadge(movement.to_status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.trackersDefective > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-700">Atenção Necessária</h3>
                <p className="text-sm text-red-600 mt-1">
                  Existem <strong>{stats.trackersDefective}</strong> rastreador(es) com defeito que precisam de verificação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
