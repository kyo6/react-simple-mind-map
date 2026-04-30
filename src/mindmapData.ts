import type { LayoutType, MindNode } from './types'

export const layoutOptions: Array<{ label: string; value: LayoutType }> = [
  { label: '思维导图', value: 'mindMap' },
  { label: '逻辑结构图', value: 'logicalStructure' },
  { label: '组织结构图', value: 'organizationStructure' },
  { label: '目录组织图', value: 'catalogOrganization' },
]

export function createId(): string {
  return crypto.randomUUID()
}

export function createNode(text = '新节点'): MindNode {
  return {
    data: {
      text,
      uid: createId(),
      expand: true,
    },
    children: [],
  }
}

export function createExampleRoot(): MindNode {
  return {
    data: {
      text: 'Simple Mind Map Demo',
      uid: createId(),
      expand: true,
    },
    children: [
      {
        data: { text: 'Mindmap 管理', uid: createId(), expand: true },
        children: [
          createNode('IndexedDB 保存'),
          createNode('新建 / 重命名 / 删除'),
          createNode('手动保存'),
        ],
      },
      {
        data: { text: '节点编辑', uid: createId(), expand: true },
        children: [
          createNode('新增子节点'),
          createNode('新增同级节点'),
          createNode('删除节点'),
        ],
      },
      {
        data: { text: '导入导出', uid: createId(), expand: true },
        children: [createNode('导入 JSON'), createNode('导出 JSON')],
      },
    ],
  }
}

export function createBlankRoot(title = '中心主题'): MindNode {
  return {
    data: {
      text: title,
      uid: createId(),
      expand: true,
    },
    children: [],
  }
}

export function cloneRoot(root: MindNode): MindNode {
  return JSON.parse(JSON.stringify(root)) as MindNode
}

export function ensureNodeIds(root: MindNode): MindNode {
  const next = cloneRoot(root)

  const walk = (node: MindNode) => {
    node.data = {
      ...node.data,
      text: String(node.data?.text || '未命名节点'),
      uid: node.data?.uid || createId(),
      expand: node.data?.expand ?? true,
    }
    node.children = Array.isArray(node.children) ? node.children : []
    node.children.forEach(walk)
  }

  walk(next)
  return next
}

export function isValidMindMapRoot(value: unknown): value is MindNode {
  if (!value || typeof value !== 'object') return false
  const node = value as MindNode
  return Boolean(node.data && typeof node.data.text === 'string')
}

export function updateNodeText(
  root: MindNode,
  uid: string,
  text: string,
): MindNode {
  return updateTree(root, uid, (node) => ({
    ...node,
    data: { ...node.data, text },
  }))
}

export function toggleNodeExpand(root: MindNode, uid: string): MindNode {
  return updateTree(root, uid, (node) => ({
    ...node,
    data: { ...node.data, expand: !node.data.expand },
  }))
}

export function addChildNode(root: MindNode, uid: string): MindNode {
  return updateTree(root, uid, (node) => ({
    ...node,
    data: { ...node.data, expand: true },
    children: [...(node.children || []), createNode()],
  }))
}

export function addSiblingNode(root: MindNode, uid: string): MindNode {
  const next = cloneRoot(root)

  const walk = (node: MindNode): boolean => {
    const children = node.children || []
    const index = children.findIndex((child) => child.data.uid === uid)
    if (index >= 0) {
      children.splice(index + 1, 0, createNode())
      node.children = children
      return true
    }
    return children.some(walk)
  }

  walk(next)
  return next
}

export function removeNode(root: MindNode, uid: string): MindNode {
  if (root.data.uid === uid) return { ...root, children: [] }

  const next = cloneRoot(root)

  const walk = (node: MindNode): boolean => {
    const children = node.children || []
    const index = children.findIndex((child) => child.data.uid === uid)
    if (index >= 0) {
      children.splice(index, 1)
      node.children = children
      return true
    }
    return children.some(walk)
  }

  walk(next)
  return next
}

function updateTree(
  root: MindNode,
  uid: string,
  updater: (node: MindNode) => MindNode,
): MindNode {
  const walk = (node: MindNode): MindNode => {
    if (node.data.uid === uid) return updater(cloneRoot(node))
    return {
      ...node,
      data: { ...node.data },
      children: (node.children || []).map(walk),
    }
  }

  return walk(root)
}
