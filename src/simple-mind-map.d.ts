import type { MindMapInstance } from './types'

declare global {
  interface Window {
    simpleMindMap?:
      | (new (options: Record<string, unknown>) => MindMapInstance)
      | {
          default: new (options: Record<string, unknown>) => MindMapInstance
        }
  }
}

export {}
