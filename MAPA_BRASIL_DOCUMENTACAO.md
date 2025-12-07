# Documentação do Mapa Interativo do Brasil

Este documento descreve a implementação completa do mapa interativo do Brasil utilizado para visualização de dados por estado, com tooltip detalhado e cores dinâmicas baseadas em métricas.

---

## 1. Visão Geral

O componente exibe um mapa do Brasil com:
- **Coloração dinâmica** por estado baseada em métricas (taxa de aceitação, valores, etc.)
- **Sigla do estado** e valor/percentual exibido sobre cada estado
- **Tooltip interativo** ao passar o mouse, mostrando detalhes do estado e lista de itens
- **Legenda** com resumo geral das métricas

---

## 2. Dependências Necessárias

### Instalação via NPM

```bash
npm install react-simple-maps
```

### Dependências no package.json

```json
{
  "dependencies": {
    "react-simple-maps": "^3.0.0"
  }
}
```

**Nota:** A biblioteca `d3-geo` é uma dependência interna do `react-simple-maps` e será instalada automaticamente.

---

## 3. Arquivo de Topologia (GeoJSON)

O mapa utiliza um arquivo JSON com a topologia dos estados brasileiros. Este arquivo contém as coordenadas geográficas de cada estado.

### Estrutura do arquivo `br_states.json`

```json
{
  "features": [
    {
      "id": "AC",
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [[[[longitude, latitude], ...]]]
      },
      "properties": {
        "sigla": "AC",
        "name": "Acre"
      }
    },
    // ... demais estados
  ]
}
```

### Onde obter o arquivo

1. **IBGE**: https://www.ibge.gov.br/geociencias/downloads-geociencias.html
2. **GitHub Brasil IO**: https://github.com/tbrugz/geodata-br
3. **Natural Earth**: https://www.naturalearthdata.com/

O arquivo deve ser colocado na pasta `src/` do projeto e importado como JSON.

---

## 4. Arquivos de Constantes

### `src/lib/constants/brazilStates.ts`

```typescript
export interface BrazilStateInfo {
  code: string;
  name: string;
}

export const BRAZIL_STATES: BrazilStateInfo[] = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

export const BRAZIL_STATE_NAMES: Record<string, string> = BRAZIL_STATES.reduce(
  (acc, state) => {
    acc[state.code] = state.name;
    return acc;
  },
  {} as Record<string, string>
);
```

---

## 5. Utilitário para Extrair Estado

### `src/lib/utils/location.ts`

```typescript
const BRAZILIAN_STATES = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]);

// Mapeamento de cidades conhecidas para seus estados
const CITY_STATE_OVERRIDES: Record<string, string> = {
  'salvador': 'BA',
  'salvador-ba': 'BA',
  'feira-de-santana': 'BA',
  'vitoria-da-conquista': 'BA',
  'curitiba': 'PR',
  'tatuape': 'SP',
  'campinas': 'SP',
  'braganca-paulista': 'SP',
  'bragança-paulista': 'SP',
  'porto-alegre': 'RS',
  'cuiaba': 'MT',
  'cuiabá': 'MT',
  'limao': 'SP',
  'limão': 'SP',
  'florianopolis': 'SC',
  'brasília': 'DF',
  'brasilia': 'DF',
  'goiania': 'GO',
  'goiânia': 'GO',
  'rio-de-janeiro': 'RJ',
  'sao-paulo': 'SP',
  'santos': 'SP',
  'sorocaba': 'SP',
  'ribeirao-preto': 'SP',
  'londrina': 'PR',
  'cascavel': 'PR',
  'foz-do-iguacu': 'PR',
  'campo-grande': 'MS',
  'palmas': 'TO',
  'manaus': 'AM',
  'belem': 'PA',
  'belém': 'PA',
  'fortaleza': 'CE',
  'natal': 'RN',
  'joao-pessoa': 'PB',
  'joão-pessoa': 'PB',
  'maceio': 'AL',
  'maceió': 'AL',
  'aracaju': 'SE',
  'recife': 'PE',
  'teresina': 'PI',
  'sao-luis': 'MA',
  'vitória': 'ES',
  'vitoria': 'ES',
  'uberlandia': 'MG',
  'uberlândia': 'MG',
  'belo-horizonte': 'MG',
  'contagem': 'MG',
};

const normalizeString = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

/**
 * Extrai o código do estado a partir de um slug ou nome de cidade
 * @param slug - Slug da cidade (ex: "salvador-ba", "sao-paulo-sp")
 * @param cityName - Nome da cidade (ex: "Salvador", "São Paulo/SP")
 * @returns Código do estado (ex: "BA", "SP") ou null se não encontrado
 */
export function extractStateFromSlug(slug?: string, cityName?: string): string | null {
  // Tentar extrair do slug (formato: cidade-uf)
  if (slug) {
    const parts = slug.split('-');
    const candidate = parts[parts.length - 1];

    if (candidate && candidate.length === 2) {
      return candidate.toUpperCase();
    }
  }

  // Tentar extrair do nome da cidade
  if (cityName) {
    const normalized = normalizeString(cityName);
    if (CITY_STATE_OVERRIDES[normalized]) {
      return CITY_STATE_OVERRIDES[normalized];
    }

    // Tentar encontrar UF no final do nome (ex: "São Paulo/SP", "Salvador (BA)")
    const ufMatch = cityName
      .toUpperCase()
      .match(/(?:\s|\/|-|\()([A-Z]{2})\)?$/);
    if (ufMatch && ufMatch[1]) {
      const candidate = ufMatch[1].toUpperCase();
      if (candidate.length === 2 && BRAZILIAN_STATES.has(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}
```

---

## 6. Componente do Mapa

### `src/components/BrazilMap.tsx`

```typescript
import { useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography, Annotation } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { Card } from '@/components/ui/card';
import { BRAZIL_STATE_NAMES } from '@/lib/constants/brazilStates';
import brazilTopology from '@/br_states.json';

// Cores para diferentes faixas de valores
const COLORS = {
  allAccepted: '#22c55e',     // Verde - 100% aceitos
  mostlyAccepted: '#84cc16',  // Verde claro - maioria aceita (>=80%)
  mixed: '#f59e0b',           // Amarelo - misturado (40-79%)
  mostlyRejected: '#f97316',  // Laranja - maioria rejeitada (1-39%)
  allRejected: '#ef4444',     // Vermelho - 100% rejeitados
  empty: '#e5e7eb',           // Cinza - sem dados
};

// Interface para dados de cada estado
export interface BrazilStateData {
  code: string;
  name: string;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number | null;
  cities: Array<{
    name: string;
    vote: 'accepted' | 'rejected' | null;
    regionalName: string;
    observations?: string;
  }>;
}

interface BrazilMapProps {
  states: Record<string, BrazilStateData>;
}

export function BrazilMap({ states }: BrazilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    code: string;
    name: string;
    totalAccepted: number;
    totalRejected: number;
    acceptanceRate: number | null;
    cities: Array<{
      name: string;
      vote: 'accepted' | 'rejected' | null;
      regionalName: string;
      observations?: string;
    }>;
    x: number;
    y: number;
  } | null>(null);

  // Calcular estatísticas gerais
  const overallStats = useMemo(() => {
    let totalAccepted = 0;
    let totalRejected = 0;

    Object.values(states).forEach(state => {
      totalAccepted += state.totalAccepted;
      totalRejected += state.totalRejected;
    });

    const total = totalAccepted + totalRejected;
    const approvalRate = total > 0 ? (totalAccepted / total) * 100 : 0;
    const rejectionRate = total > 0 ? (totalRejected / total) * 100 : 0;

    return {
      totalAccepted,
      totalRejected,
      total,
      approvalRate,
      rejectionRate,
    };
  }, [states]);

  // Configuração da projeção do mapa
  const projection = useMemo(
    () => ({
      scale: 700,
      center: [-52, -14] as [number, number],
    }),
    []
  );

  // Determinar cor do estado baseado na taxa de aceitação
  const getColor = (stateCode: string) => {
    const data = states[stateCode];

    if (!data || (data.totalAccepted === 0 && data.totalRejected === 0) || data.acceptanceRate === null) {
      return COLORS.empty;
    }

    if (data.acceptanceRate === 100) return COLORS.allAccepted;
    if (data.acceptanceRate >= 80) return COLORS.mostlyAccepted;
    if (data.acceptanceRate >= 40) return COLORS.mixed;
    if (data.acceptanceRate > 0) return COLORS.mostlyRejected;
    return COLORS.allRejected;
  };

  // Handler para exibir tooltip
  const handleTooltip = (
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
    stateCode: string,
    stateName?: string
  ) => {
    const container = containerRef.current?.getBoundingClientRect();
    const x = container ? event.clientX - container.left : event.clientX;
    const y = container ? event.clientY - container.top : event.clientY;
    const data = states[stateCode] || {
      totalAccepted: 0,
      totalRejected: 0,
      acceptanceRate: null,
      cities: [],
    };

    setTooltip({
      code: stateCode,
      name: stateName || BRAZIL_STATE_NAMES[stateCode] || stateCode,
      totalAccepted: data.totalAccepted,
      totalRejected: data.totalRejected,
      acceptanceRate: data.acceptanceRate,
      cities: data.cities || [],
      x,
      y,
    });
  };

  // Calcular posição do tooltip
  const tooltipStyle = useMemo(() => {
    if (!tooltip) return {};
    return {
      left: Math.max(0, tooltip.x - 120),
      top: Math.max(0, tooltip.y - 140),
    };
  }, [tooltip]);

  return (
    <div className="relative" ref={containerRef}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={projection}
        width={800}
        height={600}
      >
        {/* Camada 1: Desenhar os estados */}
        <Geographies geography={brazilTopology as any}>
          {({ geographies }) =>
            geographies.map(geo => {
              const rawCode =
                (geo.properties as any)?.sigla ||
                (geo.id as string) ||
                (geo.properties as any)?.id ||
                '';
              const stateCode = rawCode.toString().toUpperCase();

              const stateName =
                (geo.properties as any)?.name || BRAZIL_STATE_NAMES[stateCode] || stateCode;

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
                    hover: { fill: '#1d4ed8', outline: 'none' },
                    pressed: { fill: '#1d4ed8', outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Camada 2: Anotações (siglas e valores) */}
        <Geographies geography={brazilTopology as any}>
          {({ geographies }) =>
            geographies.map(geo => {
              const rawCode =
                (geo.properties as any)?.sigla ||
                (geo.id as string) ||
                (geo.properties as any)?.id ||
                '';
              const stateCode = rawCode.toString().toUpperCase();
              const centroid = geoCentroid(geo);
              const stateData = states[stateCode];

              if (!centroid) return null;

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
                    {/* Valor/Percentual */}
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
                      {stateData?.acceptanceRate !== null && stateData?.acceptanceRate !== undefined
                        ? `${stateData.acceptanceRate.toFixed(0)}%`
                        : '--'}
                    </text>
                  </g>
                </Annotation>
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <Card
          className="absolute z-10 w-72 p-4 text-sm shadow-lg"
          style={{
            pointerEvents: 'none',
            ...tooltipStyle,
          }}
        >
          <p className="font-semibold text-gray-900">
            {tooltip.name} ({tooltip.code})
          </p>
          <div className="mt-2 space-y-2 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Taxa de aceitação:</span>
              <span className="font-semibold text-gray-900">
                {tooltip.acceptanceRate !== null ? `${tooltip.acceptanceRate.toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-600">✓ Aceitos:</span>
              <span className="font-semibold text-green-600">{tooltip.totalAccepted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600">✗ Rejeitados:</span>
              <span className="font-semibold text-red-600">{tooltip.totalRejected}</span>
            </div>

            {/* Lista de cidades */}
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="font-semibold text-gray-700">Detalhes por cidade</p>
              {tooltip.cities.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1">Sem dados para este estado.</p>
              ) : (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tooltip.cities.map((city, idx) => (
                    <div key={`${city.name}-${idx}`} className="bg-gray-50 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium truncate">{city.name}</span>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                            city.vote === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : city.vote === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {city.vote === 'accepted' ? 'ACEITO' : city.vote === 'rejected' ? 'REJEITADO' : 'PENDENTE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Regional: {city.regionalName}
                      </p>
                      {city.observations && (
                        <p className="text-[10px] text-gray-600 mt-1 italic">
                          "{city.observations.substring(0, 60)}{city.observations.length > 60 ? '...' : ''}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.allAccepted }} />
          <span>Taxa de Aprovação: {overallStats.approvalRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.allRejected }} />
          <span>Taxa de Rejeição: {overallStats.rejectionRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Exemplo de Uso

### Preparando os dados

```typescript
import { useMemo } from 'react';
import { BRAZIL_STATES } from '@/lib/constants/brazilStates';
import { extractStateFromSlug } from '@/lib/utils/location';
import { BrazilMap, BrazilStateData } from '@/components/BrazilMap';

function MyComponent() {
  // Seus dados (ex: resultados de uma pesquisa, vendas, etc.)
  const rawData = [
    { city_name: 'Salvador', city_slug: 'salvador-ba', vote: 'accepted', regional_name: 'João' },
    { city_name: 'Feira de Santana', city_slug: 'feira-de-santana-ba', vote: 'rejected', regional_name: 'Maria' },
    { city_name: 'São Paulo', city_slug: 'sao-paulo-sp', vote: 'accepted', regional_name: 'Pedro' },
    // ... mais dados
  ];

  // Agregar dados por estado
  const stateMapData = useMemo<Record<string, BrazilStateData>>(() => {
    // Inicializar todos os estados com valores zerados
    const base = BRAZIL_STATES.reduce(
      (acc, state) => {
        acc[state.code] = {
          code: state.code,
          name: state.name,
          totalAccepted: 0,
          totalRejected: 0,
          acceptanceRate: null,
          cities: [],
        };
        return acc;
      },
      {} as Record<string, BrazilStateData>
    );

    // Processar cada item dos dados brutos
    rawData.forEach(item => {
      const stateCode = extractStateFromSlug(item.city_slug, item.city_name);
      if (!stateCode || !base[stateCode]) return;

      const state = base[stateCode];

      // Adicionar cidade à lista
      state.cities.push({
        name: item.city_name,
        vote: item.vote as 'accepted' | 'rejected' | null,
        regionalName: item.regional_name,
        observations: item.observations,
      });

      // Contar votos
      if (item.vote === 'accepted') {
        state.totalAccepted += 1;
      } else if (item.vote === 'rejected') {
        state.totalRejected += 1;
      }
    });

    // Calcular taxa de aceitação para cada estado
    Object.values(base).forEach(state => {
      const totalVotes = state.totalAccepted + state.totalRejected;
      state.acceptanceRate = totalVotes > 0
        ? (state.totalAccepted / totalVotes) * 100
        : null;
    });

    return base;
  }, [rawData]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Distribuição por Estado</h1>
      <BrazilMap states={stateMapData} />
    </div>
  );
}
```

---

## 8. Customizações

### Alterar Cores

Modifique o objeto `COLORS` no componente:

```typescript
const COLORS = {
  allAccepted: '#22c55e',     // Verde
  mostlyAccepted: '#84cc16',  // Verde claro
  mixed: '#f59e0b',           // Amarelo
  mostlyRejected: '#f97316',  // Laranja
  allRejected: '#ef4444',     // Vermelho
  empty: '#e5e7eb',           // Cinza
};
```

### Alterar Lógica de Cores

Modifique a função `getColor`:

```typescript
const getColor = (stateCode: string) => {
  const data = states[stateCode];

  if (!data || data.acceptanceRate === null) {
    return COLORS.empty;
  }

  // Customize as faixas conforme necessário
  if (data.acceptanceRate === 100) return COLORS.allAccepted;
  if (data.acceptanceRate >= 80) return COLORS.mostlyAccepted;
  if (data.acceptanceRate >= 40) return COLORS.mixed;
  if (data.acceptanceRate > 0) return COLORS.mostlyRejected;
  return COLORS.allRejected;
};
```

### Alterar Projeção

Ajuste a escala e centro do mapa:

```typescript
const projection = useMemo(
  () => ({
    scale: 700,                        // Aumentar = zoom in, Diminuir = zoom out
    center: [-52, -14] as [number, number], // [longitude, latitude] do centro
  }),
  []
);
```

### Alterar Dimensões

Modifique width e height no ComposableMap:

```typescript
<ComposableMap
  projection="geoMercator"
  projectionConfig={projection}
  width={800}   // Largura
  height={600}  // Altura
>
```

---

## 9. Adaptação para Outros Usos

### Exemplo: Mapa de Vendas por Estado

```typescript
interface SalesStateData {
  code: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number | null;
  customers: Array<{
    name: string;
    totalPurchases: number;
    lastPurchaseDate: string;
  }>;
}

// Lógica de cores baseada em receita
const getColor = (stateCode: string) => {
  const data = states[stateCode];

  if (!data || data.totalRevenue === 0) {
    return COLORS.empty;
  }

  if (data.totalRevenue >= 100000) return '#22c55e';  // Verde - Alta receita
  if (data.totalRevenue >= 50000) return '#84cc16';   // Verde claro
  if (data.totalRevenue >= 20000) return '#f59e0b';   // Amarelo
  if (data.totalRevenue >= 5000) return '#f97316';    // Laranja
  return '#ef4444';                                    // Vermelho - Baixa receita
};
```

### Exemplo: Mapa de Satisfação (NPS)

```typescript
interface NPSStateData {
  code: string;
  name: string;
  promoters: number;
  passives: number;
  detractors: number;
  npsScore: number | null;
  responses: Array<{
    customerName: string;
    score: number;
    comment?: string;
  }>;
}

// Lógica de cores baseada em NPS
const getColor = (stateCode: string) => {
  const data = states[stateCode];

  if (!data || data.npsScore === null) {
    return COLORS.empty;
  }

  if (data.npsScore >= 75) return '#22c55e';   // Excelente
  if (data.npsScore >= 50) return '#84cc16';   // Muito bom
  if (data.npsScore >= 25) return '#f59e0b';   // Bom
  if (data.npsScore >= 0) return '#f97316';    // Precisa melhorar
  return '#ef4444';                             // Crítico
};
```

---

## 10. Checklist de Implementação

- [ ] Instalar dependência: `npm install react-simple-maps`
- [ ] Adicionar arquivo `br_states.json` na pasta `src/`
- [ ] Criar arquivo `src/lib/constants/brazilStates.ts`
- [ ] Criar arquivo `src/lib/utils/location.ts`
- [ ] Criar componente `src/components/BrazilMap.tsx`
- [ ] Configurar TypeScript para importar JSON (se necessário):

```json
// tsconfig.json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

- [ ] Preparar dados no formato esperado pelo componente
- [ ] Integrar componente na página desejada

---

## 11. Recursos Adicionais

### Links Úteis

- **react-simple-maps**: https://www.react-simple-maps.io/
- **d3-geo**: https://github.com/d3/d3-geo
- **GeoJSON Brasil**: https://github.com/tbrugz/geodata-br
- **IBGE Geociências**: https://www.ibge.gov.br/geociencias/downloads-geociencias.html

### Troubleshooting

1. **Mapa não aparece**: Verifique se o arquivo `br_states.json` está no caminho correto
2. **Estados sem cor**: Verifique se os códigos dos estados no JSON correspondem aos esperados (AC, AL, AM, etc.)
3. **Tooltip não posiciona corretamente**: Ajuste os valores em `tooltipStyle`
4. **Performance lenta**: Considere usar `useMemo` para processamento pesado de dados

---

*Documento criado em: Dezembro 2024*
*Baseado no projeto: City Scope CRM - Master Brasil*
