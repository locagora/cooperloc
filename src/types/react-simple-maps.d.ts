declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: {
      scale?: number
      center?: [number, number]
      rotate?: [number, number, number]
    }
    width?: number
    height?: number
    children?: ReactNode
  }

  export interface GeographiesProps {
    geography: string | object
    children: (data: { geographies: Geography[] }) => ReactNode
  }

  export interface Geography {
    rsmKey: string
    id?: string
    properties?: Record<string, unknown>
    geometry: {
      type: string
      coordinates: number[][][]
    }
  }

  export interface GeographyProps {
    geography: Geography
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void
    onMouseMove?: (event: React.MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties & { fill?: string; outline?: string }
      hover?: React.CSSProperties & { fill?: string; outline?: string }
      pressed?: React.CSSProperties & { fill?: string; outline?: string }
    }
  }

  export interface AnnotationProps {
    subject: [number, number]
    dx?: number
    dy?: number
    connectorProps?: Record<string, unknown>
    children?: ReactNode
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const Annotation: ComponentType<AnnotationProps>
}
