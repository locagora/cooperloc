import { useMemo, useRef, useState } from 'react'
import { ComposableMap, Geographies, Geography, Annotation, type Geography as GeoType } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo'
import { Card } from '@/components/ui/card'
import { BRAZIL_STATE_NAMES } from '@/lib/constants/brazilStates'
import brazilTopology from '../../br_states.json'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoFeature = GeoType & { geometry: any }

// Cores para diferentes faixas de quantidade
const COLORS = {
  high: '#22c55e',      // Verde - muitos rastreadores (>20)
  medium: '#84cc16',    // Verde claro - quantidade média (11-20)
  low: '#f59e0b',       // Amarelo - poucos (6-10)
  veryLow: '#f97316',   // Laranja - muito poucos (1-5)
  empty: '#e5e7eb',     // Cinza - sem dados
}

// Interface para dados de cada estado
export interface TrackerStateData {
  code: string
  name: string
  totalSent: number
  totalInstalled: number
  totalDefective: number
  franchises: Array<{
    name: string
    sent: number
    installed: number
    defective: number
  }>
}

interface BrazilTrackerMapProps {
  states: Record<string, TrackerStateData>
}

export function BrazilTrackerMap({ states }: BrazilTrackerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<{
    code: string
    name: string
    totalSent: number
    totalInstalled: number
    totalDefective: number
    franchises: Array<{
      name: string
      sent: number
      installed: number
      defective: number
    }>
    x: number
    y: number
  } | null>(null)

  // Calcular estatísticas gerais
  const overallStats = useMemo(() => {
    let totalSent = 0
    let totalInstalled = 0
    let totalDefective = 0

    Object.values(states).forEach(state => {
      totalSent += state.totalSent
      totalInstalled += state.totalInstalled
      totalDefective += state.totalDefective
    })

    return {
      totalSent,
      totalInstalled,
      totalDefective,
      pending: totalSent - totalInstalled - totalDefective,
    }
  }, [states])

  // Configuração da projeção do mapa
  const projection = useMemo(
    () => ({
      scale: 700,
      center: [-52, -14] as [number, number],
    }),
    []
  )

  // Determinar cor do estado baseado na quantidade total
  const getColor = (stateCode: string) => {
    const data = states[stateCode]

    if (!data || data.totalSent === 0) {
      return COLORS.empty
    }

    if (data.totalSent > 20) return COLORS.high
    if (data.totalSent > 10) return COLORS.medium
    if (data.totalSent > 5) return COLORS.low
    return COLORS.veryLow
  }

  // Handler para exibir tooltip
  const handleTooltip = (
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
    stateCode: string,
    stateName?: string
  ) => {
    const container = containerRef.current?.getBoundingClientRect()
    const x = container ? event.clientX - container.left : event.clientX
    const y = container ? event.clientY - container.top : event.clientY
    const data = states[stateCode] || {
      totalSent: 0,
      totalInstalled: 0,
      totalDefective: 0,
      franchises: [],
    }

    setTooltip({
      code: stateCode,
      name: stateName || BRAZIL_STATE_NAMES[stateCode] || stateCode,
      totalSent: data.totalSent,
      totalInstalled: data.totalInstalled,
      totalDefective: data.totalDefective,
      franchises: data.franchises || [],
      x,
      y,
    })
  }

  // Calcular posição do tooltip
  const tooltipStyle = useMemo(() => {
    if (!tooltip) return {}
    return {
      left: Math.max(0, Math.min(tooltip.x - 140, 400)),
      top: Math.max(0, tooltip.y - 160),
    }
  }, [tooltip])

  return (
    <div className="relative" ref={containerRef}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={projection}
        width={800}
        height={600}
      >
        {/* Camada 1: Desenhar os estados */}
        <Geographies geography={brazilTopology as unknown as string}>
          {({ geographies }: { geographies: GeoFeature[] }) =>
            geographies.map((geo: GeoFeature) => {
              const rawCode =
                (geo.properties as Record<string, unknown>)?.sigla ||
                (geo.id as string) ||
                (geo.properties as Record<string, unknown>)?.id ||
                ''
              const stateCode = rawCode.toString().toUpperCase()

              const stateName =
                (geo.properties as Record<string, unknown>)?.name as string || BRAZIL_STATE_NAMES[stateCode] || stateCode

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={event => handleTooltip(event, stateCode, stateName)}
                  onMouseMove={event => handleTooltip(event, stateCode, stateName)}
                  onMouseLeave={() => setTooltip(null)}
                  stroke="#ffffff"
                  strokeWidth={0.75}
                  style={{
                    default: { fill: getColor(stateCode), outline: 'none' },
                    hover: { fill: '#6B73FF', outline: 'none' },
                    pressed: { fill: '#6B73FF', outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>

        {/* Camada 2: Anotações (siglas e valores) */}
        <Geographies geography={brazilTopology as unknown as string}>
          {({ geographies }: { geographies: GeoFeature[] }) =>
            geographies.map((geo: GeoFeature) => {
              const rawCode =
                (geo.properties as Record<string, unknown>)?.sigla ||
                (geo.id as string) ||
                (geo.properties as Record<string, unknown>)?.id ||
                ''
              const stateCode = rawCode.toString().toUpperCase()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const centroid = geoCentroid(geo as any)
              const stateData = states[stateCode]

              if (!centroid) return null

              return (
                <Annotation
                  key={`annotation-${geo.rsmKey}`}
                  subject={centroid}
                  dx={0}
                  dy={0}
                  connectorProps={{}}
                >
                  <g style={{ pointerEvents: 'none' }}>
                    {/* Sigla do estado */}
                    <text
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={700}
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth={2}
                      paintOrder="stroke"
                      y={-4}
                    >
                      {stateCode}
                    </text>
                    {/* Quantidade total */}
                    <text
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      paintOrder="stroke"
                      y={10}
                    >
                      {stateData?.totalSent || 0}
                    </text>
                  </g>
                </Annotation>
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <Card
          className="absolute z-10 w-72 p-4 text-sm shadow-lg bg-white"
          style={{
            pointerEvents: 'none',
            ...tooltipStyle,
          }}
        >
          <p className="font-semibold text-gray-900 text-base">
            {tooltip.name} ({tooltip.code})
          </p>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
              <span className="text-blue-700 font-medium">Total Enviados:</span>
              <span className="font-bold text-blue-900">{tooltip.totalSent}</span>
            </div>
            <div className="flex items-center justify-between bg-green-50 p-2 rounded">
              <span className="text-green-700 font-medium">Instalados:</span>
              <span className="font-bold text-green-900">{tooltip.totalInstalled}</span>
            </div>
            <div className="flex items-center justify-between bg-yellow-50 p-2 rounded">
              <span className="text-yellow-700 font-medium">Aguardando:</span>
              <span className="font-bold text-yellow-900">
                {tooltip.totalSent - tooltip.totalInstalled - tooltip.totalDefective}
              </span>
            </div>
            <div className="flex items-center justify-between bg-red-50 p-2 rounded">
              <span className="text-red-700 font-medium">Com Defeito:</span>
              <span className="font-bold text-red-900">{tooltip.totalDefective}</span>
            </div>

            {/* Lista de franquias */}
            {tooltip.franchises.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="font-semibold text-gray-700 mb-2">Franquias:</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tooltip.franchises.map((franchise, idx) => (
                    <div key={`${franchise.name}-${idx}`} className="bg-gray-50 rounded p-2">
                      <p className="font-medium text-gray-800 truncate">{franchise.name}</p>
                      <div className="flex gap-3 mt-1 text-[10px]">
                        <span className="text-blue-600">Env: {franchise.sent}</span>
                        <span className="text-green-600">Inst: {franchise.installed}</span>
                        <span className="text-red-600">Def: {franchise.defective}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.high }} />
          <span>{'> 20 rastreadores'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.medium }} />
          <span>11-20 rastreadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.low }} />
          <span>6-10 rastreadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.veryLow }} />
          <span>1-5 rastreadores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.empty }} />
          <span>Sem envios</span>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{overallStats.totalSent}</p>
          <p className="text-xs text-blue-600">Total Enviados</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-2xl font-bold text-green-700">{overallStats.totalInstalled}</p>
          <p className="text-xs text-green-600">Instalados</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-2xl font-bold text-yellow-700">{overallStats.pending}</p>
          <p className="text-xs text-yellow-600">Aguardando</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-2xl font-bold text-red-700">{overallStats.totalDefective}</p>
          <p className="text-xs text-red-600">Com Defeito</p>
        </div>
      </div>
    </div>
  )
}
