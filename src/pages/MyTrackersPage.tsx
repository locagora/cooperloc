import { useEffect, useState } from 'react'
import { Search, Filter, Package, CheckCircle, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import type { Tracker } from '@/integrations/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InstallationFormData {
  client_cnpj: string
  client_name: string
  client_contact: string
  vehicle_chassis: string
  vehicle_plate: string
  vehicle_brand: string
  vehicle_model: string
  installation_month: string
}

const initialFormData: InstallationFormData = {
  client_cnpj: '',
  client_name: '',
  client_contact: '',
  vehicle_chassis: '',
  vehicle_plate: '',
  vehicle_brand: '',
  vehicle_model: '',
  installation_month: '',
}

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function MyTrackersPage() {
  const { profile } = useAuth()
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null)
  const [formData, setFormData] = useState<InstallationFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)

  const fetchTrackers = async () => {
    if (!profile?.franchise_id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('trackers')
        .select('*')
        .eq('franchise_id', profile.franchise_id)
        .order('sent_at', { ascending: false })

      if (error) throw error
      setTrackers(data as Tracker[])
    } catch (error) {
      console.error('Error fetching trackers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackers()
  }, [profile?.franchise_id])

  const handleOpenInstallModal = (tracker: Tracker) => {
    setSelectedTracker(tracker)
    setFormData({
      ...initialFormData,
      client_contact: profile?.full_name || '',
    })
    setShowInstallModal(true)
  }

  const handleCloseInstallModal = () => {
    setShowInstallModal(false)
    setSelectedTracker(null)
    setFormData(initialFormData)
  }

  const handleInstallSubmit = async () => {
    if (!selectedTracker) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('trackers')
        .update({
          status: 'instalado',
          installed_at: new Date().toISOString(),
          client_cnpj: formData.client_cnpj || null,
          client_name: formData.client_name || null,
          client_contact: formData.client_contact || null,
          vehicle_chassis: formData.vehicle_chassis || null,
          vehicle_plate: formData.vehicle_plate || null,
          vehicle_brand: formData.vehicle_brand || null,
          vehicle_model: formData.vehicle_model || null,
          installation_month: formData.installation_month || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTracker.id)

      if (error) {
        console.error('Supabase error:', error)
        alert(`Erro ao registrar instalação: ${error.message}`)
        return
      }

      handleCloseInstallModal()
      fetchTrackers()
    } catch (error) {
      console.error('Error updating tracker:', error)
      alert('Erro inesperado ao registrar instalação')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkAsDefective = async (tracker: Tracker) => {
    if (!confirm('Tem certeza que deseja marcar este rastreador como defeituoso?')) return

    try {
      const { error } = await supabase
        .from('trackers')
        .update({
          status: 'defeito',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tracker.id)

      if (error) throw error
      fetchTrackers()
    } catch (error) {
      console.error('Error updating tracker:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge variant="warning">Recebido</Badge>
      case 'instalado':
        return <Badge variant="success">Instalado</Badge>
      case 'defeito':
        return <Badge variant="destructive">Defeito</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredTrackers = trackers.filter((tracker) => {
    const matchesSearch =
      tracker.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tracker.model?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || tracker.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const stats = {
    total: trackers.length,
    received: trackers.filter((t) => t.status === 'enviado').length,
    installed: trackers.filter((t) => t.status === 'instalado').length,
    defective: trackers.filter((t) => t.status === 'defeito').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Rastreadores</h1>
        <p className="text-muted-foreground">
          Rastreadores recebidos pela sua franquia
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Instalação</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.received}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Instalados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.installed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Defeito</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defective}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de série ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="enviado">Recebidos</SelectItem>
                <SelectItem value="instalado">Instalados</SelectItem>
                <SelectItem value="defeito">Com Defeito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trackers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Rastreadores ({filteredTrackers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Série</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Data Instalação</TableHead>
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
              ) : filteredTrackers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum rastreador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrackers.map((tracker) => (
                  <TableRow key={tracker.id}>
                    <TableCell className="font-medium">{tracker.serial_number}</TableCell>
                    <TableCell>{tracker.model || '-'}</TableCell>
                    <TableCell>{getStatusBadge(tracker.status)}</TableCell>
                    <TableCell>{formatDate(tracker.sent_at)}</TableCell>
                    <TableCell>{formatDate(tracker.installed_at)}</TableCell>
                    <TableCell className="text-right">
                      {tracker.status === 'enviado' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleOpenInstallModal(tracker)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Instalar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleMarkAsDefective(tracker)}
                          >
                            Defeito
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Installation Modal */}
      {showInstallModal && selectedTracker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registrar Instalação</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseInstallModal}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800">Rastreador: {selectedTracker.serial_number}</p>
                <p className="text-blue-600">Modelo: {selectedTracker.model || 'N/A'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_cnpj">CNPJ do Cliente</Label>
                <Input
                  id="client_cnpj"
                  value={formData.client_cnpj}
                  onChange={(e) => setFormData({ ...formData, client_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">Nome da Empresa</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome da empresa cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_contact">Franqueado Responsável</Label>
                <Input
                  id="client_contact"
                  value={formData.client_contact}
                  onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_chassis">Chassi do Veículo</Label>
                <Input
                  id="vehicle_chassis"
                  value={formData.vehicle_chassis}
                  onChange={(e) => setFormData({ ...formData, vehicle_chassis: e.target.value })}
                  placeholder="Número do chassi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Placa do Veículo</Label>
                <Input
                  id="vehicle_plate"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_brand">Marca do Rastreador</Label>
                <Input
                  id="vehicle_brand"
                  value={formData.vehicle_brand}
                  onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                  placeholder="Ex: Suntech, Queclink"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_model">Modelo do Veículo</Label>
                <Input
                  id="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                  placeholder="Ex: Honda CG 160, Fiat Strada"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installation_month">Mês de Instalação</Label>
                <Select
                  value={formData.installation_month}
                  onValueChange={(value) => setFormData({ ...formData, installation_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleCloseInstallModal}>
                  Cancelar
                </Button>
                <Button onClick={handleInstallSubmit} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Confirmar Instalação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
