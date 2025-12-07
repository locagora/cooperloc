import { useEffect, useState } from 'react'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase'
import type { Franchise } from '@/integrations/supabase/types'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'

interface FranchiseWithStats extends Franchise {
  tracker_count?: number
}

export function FranchisesPage() {
  const { role } = useAuth()
  const [franchises, setFranchises] = useState<FranchiseWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
  })

  const fetchFranchises = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select('*')
        .order('name')

      if (error) throw error

      // Get tracker counts for each franchise
      const franchisesWithStats = await Promise.all(
        (data as Franchise[]).map(async (franchise) => {
          const { count } = await supabase
            .from('trackers')
            .select('*', { count: 'exact', head: true })
            .eq('franchise_id', franchise.id)

          return {
            ...franchise,
            tracker_count: count || 0,
          }
        })
      )

      setFranchises(franchisesWithStats)
    } catch (error) {
      console.error('Error fetching franchises:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFranchises()
  }, [])

  const handleOpenModal = (franchise?: Franchise) => {
    if (franchise) {
      setEditingFranchise(franchise)
      setFormData({
        name: franchise.name,
        cnpj: franchise.cnpj || '',
        address: franchise.address || '',
        city: franchise.city || '',
        state: franchise.state || '',
        phone: franchise.phone || '',
        email: franchise.email || '',
      })
    } else {
      setEditingFranchise(null)
      setFormData({
        name: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingFranchise) {
        const { error } = await supabase
          .from('franchises')
          .update({
            name: formData.name,
            cnpj: formData.cnpj || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            phone: formData.phone || null,
            email: formData.email || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingFranchise.id)

        if (error) {
          console.error('Supabase error:', error)
          alert(`Erro ao atualizar franquia: ${error.message}`)
          return
        }
      } else {
        const { data, error } = await supabase.from('franchises').insert({
          name: formData.name,
          cnpj: formData.cnpj || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          phone: formData.phone || null,
          email: formData.email || null,
        }).select()

        if (error) {
          console.error('Supabase error:', error)
          alert(`Erro ao adicionar franquia: ${error.message}`)
          return
        }
        console.log('Franchise added:', data)
      }

      setShowModal(false)
      fetchFranchises()
    } catch (error) {
      console.error('Error saving franchise:', error)
      alert('Erro inesperado ao salvar franquia')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta franquia?')) return

    try {
      const { error } = await supabase.from('franchises').delete().eq('id', id)
      if (error) throw error
      fetchFranchises()
    } catch (error) {
      console.error('Error deleting franchise:', error)
    }
  }

  const handleToggleActive = async (franchise: Franchise) => {
    try {
      const { error } = await supabase
        .from('franchises')
        .update({ active: !franchise.active })
        .eq('id', franchise.id)

      if (error) throw error
      fetchFranchises()
    } catch (error) {
      console.error('Error toggling franchise status:', error)
    }
  }

  const filteredFranchises = franchises.filter(
    (franchise) =>
      franchise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.cnpj?.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Franquias</h1>
          <p className="text-muted-foreground">Gerencie as franquias CooperLoc</p>
        </div>
        {(role === 'admin' || role === 'matriz') && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Franquia
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Franchises Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Franquias ({filteredFranchises.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Rastreadores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredFranchises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma franquia encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredFranchises.map((franchise) => (
                  <TableRow key={franchise.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{franchise.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {franchise.city && franchise.state
                        ? `${franchise.city}/${franchise.state}`
                        : '-'}
                    </TableCell>
                    <TableCell>{franchise.cnpj || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {franchise.phone && <p>{franchise.phone}</p>}
                        {franchise.email && (
                          <p className="text-muted-foreground">{franchise.email}</p>
                        )}
                        {!franchise.phone && !franchise.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{franchise.tracker_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={franchise.active ? 'success' : 'secondary'}>
                        {franchise.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(franchise)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(franchise)}>
                            {franchise.active ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          {role === 'admin' && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(franchise.id)}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingFranchise ? 'Editar Franquia' : 'Adicionar Franquia'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Franquia *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: CooperLoc São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@franquia.com"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!formData.name}>
                  {editingFranchise ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
