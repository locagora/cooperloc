import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2, Send, Map, List } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import type { Tracker, Franchise } from '@/integrations/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrazilTrackerMap } from '@/components/BrazilTrackerMap'
import type { TrackerStateData } from '@/components/BrazilTrackerMap'
import { BRAZIL_STATES } from '@/lib/constants/brazilStates'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface TrackerWithFranchise extends Tracker {
  franchises?: { name: string; state: string | null } | null
}

export function TrackersPage() {
  const { role } = useAuth()
  const [trackers, setTrackers] = useState<TrackerWithFranchise[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<TrackerWithFranchise | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  // Form states
  const [newTracker, setNewTracker] = useState({
    serial_number: '',
    model: '',
    notes: '',
  })
  const [sendToFranchise, setSendToFranchise] = useState('')

  const fetchTrackers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('trackers')
        .select('*, franchises(name, state)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrackers(data as TrackerWithFranchise[])
    } catch (error) {
      console.error('Error fetching trackers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFranchises = async () => {
    const { data } = await supabase
      .from('franchises')
      .select('*')
      .eq('active', true)
      .order('name')

    if (data) setFranchises(data as Franchise[])
  }

  useEffect(() => {
    fetchTrackers()
    fetchFranchises()
  }, [])

  const handleAddTracker = async () => {
    try {
      const { data, error } = await supabase.from('trackers').insert({
        serial_number: newTracker.serial_number,
        model: newTracker.model || null,
        notes: newTracker.notes || null,
        status: 'estoque',
      }).select()

      if (error) {
        console.error('Supabase error:', error)
        alert(`Erro ao adicionar rastreador: ${error.message}`)
        return
      }

      console.log('Tracker added:', data)
      setShowAddModal(false)
      setNewTracker({ serial_number: '', model: '', notes: '' })
      fetchTrackers()
    } catch (error) {
      console.error('Error adding tracker:', error)
      alert('Erro inesperado ao adicionar rastreador')
    }
  }

  const handleSendTracker = async () => {
    if (!selectedTracker || !sendToFranchise) return

    try {
      const { error } = await supabase
        .from('trackers')
        .update({
          status: 'enviado',
          franchise_id: sendToFranchise,
          sent_at: new Date().toISOString(),
        })
        .eq('id', selectedTracker.id)

      if (error) throw error

      setShowSendModal(false)
      setSelectedTracker(null)
      setSendToFranchise('')
      fetchTrackers()
    } catch (error) {
      console.error('Error sending tracker:', error)
    }
  }

  const handleDeleteTracker = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este rastreador?')) return

    try {
      const { error } = await supabase.from('trackers').delete().eq('id', id)
      if (error) throw error
      fetchTrackers()
    } catch (error) {
      console.error('Error deleting tracker:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'estoque':
        return <Badge variant="secondary">Em Estoque</Badge>
      case 'enviado':
        return <Badge variant="warning">Enviado</Badge>
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

  // Calcular dados por estado para o mapa
  const stateMapData = useMemo<Record<string, TrackerStateData>>(() => {
    // Inicializar todos os estados
    const base = BRAZIL_STATES.reduce(
      (acc, state) => {
        acc[state.code] = {
          code: state.code,
          name: state.name,
          totalSent: 0,
          totalInstalled: 0,
          totalDefective: 0,
          franchises: [],
        }
        return acc
      },
      {} as Record<string, TrackerStateData>
    )

    // Agrupar rastreadores por franquia e estado
    const franchiseMap: Record<string, {
      name: string
      state: string
      sent: number
      installed: number
      defective: number
    }> = {}

    trackers.forEach(tracker => {
      if (!tracker.franchises?.state) return

      const stateCode = tracker.franchises.state.toUpperCase()
      const franchiseKey = `${tracker.franchise_id}-${stateCode}`

      if (!franchiseMap[franchiseKey]) {
        franchiseMap[franchiseKey] = {
          name: tracker.franchises.name,
          state: stateCode,
          sent: 0,
          installed: 0,
          defective: 0,
        }
      }

      // Contar por status
      if (tracker.status === 'enviado' || tracker.status === 'instalado' || tracker.status === 'defeito') {
        franchiseMap[franchiseKey].sent += 1
      }
      if (tracker.status === 'instalado') {
        franchiseMap[franchiseKey].installed += 1
      }
      if (tracker.status === 'defeito') {
        franchiseMap[franchiseKey].defective += 1
      }
    })

    // Agregar por estado
    Object.values(franchiseMap).forEach(franchise => {
      const stateCode = franchise.state
      if (base[stateCode]) {
        base[stateCode].totalSent += franchise.sent
        base[stateCode].totalInstalled += franchise.installed
        base[stateCode].totalDefective += franchise.defective
        base[stateCode].franchises.push({
          name: franchise.name,
          sent: franchise.sent,
          installed: franchise.installed,
          defective: franchise.defective,
        })
      }
    })

    return base
  }, [trackers])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rastreadores</h1>
          <p className="text-muted-foreground">Gerencie o estoque de rastreadores</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle View Buttons */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="rounded-none"
            >
              <Map className="w-4 h-4 mr-1" />
              Mapa
            </Button>
          </div>
          {(role === 'admin' || role === 'matriz') && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Rastreador
            </Button>
          )}
        </div>
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
                <SelectItem value="estoque">Em Estoque</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="instalado">Instalado</SelectItem>
                <SelectItem value="defeito">Defeito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Map View */}
      {viewMode === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Rastreadores por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <BrazilTrackerMap states={stateMapData} />
          </CardContent>
        </Card>
      )}

      {/* Trackers Table */}
      {viewMode === 'list' && (
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
                <TableHead>Franquia</TableHead>
                <TableHead>Data Envio</TableHead>
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
                    <TableCell>{tracker.franchises?.name || '-'}</TableCell>
                    <TableCell>{formatDate(tracker.sent_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {tracker.status === 'estoque' && (role === 'admin' || role === 'matriz') && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTracker(tracker)
                                setShowSendModal(true)
                              }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Enviar para Franquia
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {role === 'admin' && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteTracker(tracker.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Add Tracker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Adicionar Rastreador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serial_number">Número de Série *</Label>
                <Input
                  id="serial_number"
                  value={newTracker.serial_number}
                  onChange={(e) =>
                    setNewTracker({ ...newTracker, serial_number: e.target.value })
                  }
                  placeholder="Ex: TRK-001234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={newTracker.model}
                  onChange={(e) => setNewTracker({ ...newTracker, model: e.target.value })}
                  placeholder="Ex: GPS-Pro 2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={newTracker.notes}
                  onChange={(e) => setNewTracker({ ...newTracker, notes: e.target.value })}
                  placeholder="Notas adicionais..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTracker} disabled={!newTracker.serial_number}>
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send Tracker Modal */}
      {showSendModal && selectedTracker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Enviar Rastreador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rastreador: <strong>{selectedTracker.serial_number}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="franchise">Selecione a Franquia *</Label>
                <Select value={sendToFranchise} onValueChange={setSendToFranchise}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma franquia" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSendModal(false)
                    setSelectedTracker(null)
                    setSendToFranchise('')
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSendTracker} disabled={!sendToFranchise}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
