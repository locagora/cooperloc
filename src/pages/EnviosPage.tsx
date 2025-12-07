import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase'
import type { Tracker } from '@/integrations/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrazilTrackerMap } from '@/components/BrazilTrackerMap'
import type { TrackerStateData } from '@/components/BrazilTrackerMap'
import { BRAZIL_STATES } from '@/lib/constants/brazilStates'

interface TrackerWithFranchise extends Tracker {
  franchises?: { name: string; state: string | null } | null
}

export function EnviosPage() {
  const [trackers, setTrackers] = useState<TrackerWithFranchise[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    fetchTrackers()
  }, [])

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
      <div>
        <h1 className="text-2xl font-bold">Envios de Rastreadores</h1>
        <p className="text-muted-foreground">Visualize a distribuição de rastreadores por estado</p>
      </div>

      {/* Map View */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Rastreadores por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Carregando mapa...</p>
            </div>
          ) : (
            <BrazilTrackerMap states={stateMapData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
