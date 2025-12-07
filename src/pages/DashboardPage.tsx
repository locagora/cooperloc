import { useEffect, useState } from 'react'
import { Package, Building2, Truck, AlertTriangle, CheckCircle2, Archive, BarChart3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardStats {
  totalTrackers: number
  trackersInStock: number
  trackersSent: number
  trackersReceived: number
  trackersInstalled: number
  trackersDefective: number
  totalFranchises: number
}

interface MonthlyData {
  month: string
  monthName: string
  count: number
}

export function DashboardPage() {
  const { profile, role } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalTrackers: 0,
    trackersInStock: 0,
    trackersSent: 0,
    trackersReceived: 0,
    trackersInstalled: 0,
    trackersDefective: 0,
    totalFranchises: 0,
  })
  const [monthlyStock, setMonthlyStock] = useState<MonthlyData[]>([])
  const [_isLoading, setIsLoading] = useState(true)

  const MONTH_NAMES = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]

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
          recebido: 0,
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
          trackersReceived: statusCounts.recebido,
          trackersInstalled: statusCounts.instalado,
          trackersDefective: statusCounts.defeito,
          totalFranchises: franchiseCount,
        })

        // Buscar dados mensais de entrada no estoque (trackers criados por mês)
        const currentYear = new Date().getFullYear()
        const startOfYear = `${currentYear}-01-01T00:00:00.000Z`
        const endOfYear = `${currentYear}-12-31T23:59:59.999Z`

        let stockQuery = supabase
          .from('trackers')
          .select('created_at')
          .gte('created_at', startOfYear)
          .lte('created_at', endOfYear)

        if (role === 'franqueado' && profile?.franchise_id) {
          stockQuery = stockQuery.eq('franchise_id', profile.franchise_id)
        }

        const { data: stockData, error: stockError } = await stockQuery

        if (stockError) {
          console.error('Error fetching stock data:', stockError)
        }

        // Inicializar contagem por mês
        const monthCounts: Record<string, number> = {}
        for (let i = 1; i <= 12; i++) {
          const monthKey = i.toString().padStart(2, '0')
          monthCounts[monthKey] = 0
        }

        // Contar trackers por mês de criação
        stockData?.forEach((tracker) => {
          const date = new Date(tracker.created_at)
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          monthCounts[month]++
        })

        // Converter para array de dados mensais
        const monthlyData: MonthlyData[] = Object.entries(monthCounts).map(([month, count]) => ({
          month,
          monthName: MONTH_NAMES[parseInt(month) - 1],
          count,
        }))

        setMonthlyStock(monthlyData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [role, profile?.franchise_id])

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
                <p className="text-3xl font-bold text-[#6B73FF] mt-1">
                  {role === 'franqueado' ? stats.trackersReceived : stats.trackersInStock}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {role === 'franqueado' ? 'Disponíveis para instalação' : 'Disponíveis para envio'}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-[#6B73FF]/10 flex items-center justify-center">
                <Archive className="h-7 w-7 text-[#6B73FF]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enviados / Em Trânsito */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {role === 'franqueado' ? 'Em Trânsito' : 'Enviados'}
                </p>
                <p className="text-3xl font-bold text-amber-500 mt-1">{stats.trackersSent}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {role === 'franqueado' ? 'A caminho da sua unidade' : 'Aguardando instalação'}
                </p>
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
                <span className="font-semibold text-[#1E3A5F]">
                  {role === 'franqueado' ? stats.trackersReceived : stats.trackersInStock}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6B73FF] rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.totalTrackers > 0 ? ((role === 'franqueado' ? stats.trackersReceived : stats.trackersInStock) / stats.totalTrackers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Enviados / Em Trânsito */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium">{role === 'franqueado' ? 'Em Trânsito' : 'Enviados'}</span>
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

        {/* Entrada no Estoque - Gráfico Mensal */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-[#1E3A5F]">Entrada no Estoque</CardTitle>
                <p className="text-sm text-muted-foreground">Rastreadores adicionados por mês ({new Date().getFullYear()})</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[#1E3A5F]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxCount = Math.max(...monthlyStock.map(m => m.count), 1)
              const totalYear = monthlyStock.reduce((sum, m) => sum + m.count, 0)

              return (
                <div className="space-y-4">
                  {/* Barra de gráfico */}
                  <div className="flex items-end justify-between gap-1 h-40">
                    {monthlyStock.map((data) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-[#1E3A5F]">
                          {data.count > 0 ? data.count : ''}
                        </span>
                        <div
                          className="w-full bg-gradient-to-t from-[#1E3A5F] to-[#6B73FF] rounded-t-sm transition-all duration-500 hover:opacity-80"
                          style={{
                            height: `${data.count > 0 ? (data.count / maxCount) * 100 : 4}%`,
                            minHeight: '4px',
                            opacity: data.count > 0 ? 1 : 0.3,
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium">{data.monthName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total do ano */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total no ano</span>
                      <span className="text-lg font-bold text-[#1E3A5F]">{totalYear} rastreadores</span>
                    </div>
                  </div>
                </div>
              )
            })()}
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
