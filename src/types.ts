export type LayoutType =
  | 'mindMap'
  | 'logicalStructure'
  | 'organizationStructure'
  | 'catalogOrganization'

export interface MindNodeTagStyle {
  fill?: string
  fontSize?: number
  height?: number
  paddingX?: number
  radius?: number
  width?: number
}

export type MindNodeTag =
  | string
  | {
      text: string
      style?: MindNodeTagStyle
    }

export interface MindNodeData {
  text: string
  uid?: string
  expand?: boolean
  tag?: MindNodeTag[]
  note?: string
  nextSystemPrompt?: string
  color?: string
  [key: string]: unknown
}

export interface MindNode {
  data: MindNodeData
  children?: MindNode[]
  [key: string]: unknown
}

export interface MindMapDocument {
  id: string
  title: string
  root: MindNode
  layout: LayoutType
  createdAt: number
  updatedAt: number
}

export interface MindMapInstance {
  destroy: () => void
  getData: (withConfig?: boolean) => MindNode
  setData: (data: MindNode) => void
  updateData?: (data: MindNode) => void
  setLayout: (layout: LayoutType, notRender?: boolean) => void
  getLayout: () => LayoutType
  resize: () => void
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
  execCommand: (command: string, ...args: unknown[]) => void
  view: {
    enlarge: () => void
    narrow: () => void
    fit: () => void
  }
  renderer: {
    findNodeByUid: (uid: string) => unknown
    activeNodeList: unknown[]
  }
}

export interface AISettings {
  api: string
  secret: string
  model: string
  depth: number
  temperature: number
  thinkingModel: string
  systemPrompt: string
  language: string
}

export interface ThinkingModelExample {
  name: string
  description: string
  layout: string
  content: string
}

export interface ThinkingModel {
  label: string
  value: string
  description: string
  prompt: string
  example: ThinkingModelExample[]
}

export interface AIGenerateNode {
  data: {
    text: string
    note: string
    nextSystemPrompt: string
    color: string
  }
  children: AIGenerateNode[]
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  api: '',
  secret: '',
  model: 'gpt-4o',
  depth: 5,
  temperature: 0.7,
  thinkingModel: 'default',
  systemPrompt: '',
  language: '中文',
}
