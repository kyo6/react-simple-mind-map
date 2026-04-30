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
