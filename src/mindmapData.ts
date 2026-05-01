import type { LayoutType, MindNode, MindNodeTag, AIGenerateNode } from './types'

export const layoutOptions: Array<{ label: string; value: LayoutType }> = [
  { label: '思维导图', value: 'mindMap' },
  { label: '逻辑结构图', value: 'logicalStructure' },
  { label: '组织结构图', value: 'organizationStructure' },
  { label: '目录组织图', value: 'catalogOrganization' },
]

export const tagOptions = ['需求', '模块', '测试点'] as const

export type TagLabel = (typeof tagOptions)[number]

const tagFillByLabel: Record<TagLabel, string> = {
  需求: '#3b82f6',
  模块: '#10b981',
  测试点: '#f97316',
}

function createTag(label: TagLabel): MindNodeTag {
  return {
    text: label,
    style: {
      fill: tagFillByLabel[label],
      fontSize: 12,
      height: 20,
      paddingX: 6,
      radius: 3,
    },
  }
}

export function createId(): string {
  return crypto.randomUUID()
}

export function createNode(text = '新节点', tag?: TagLabel): MindNode {
  return {
    data: {
      text,
      uid: createId(),
      expand: true,
      ...(tag ? { tag: [createTag(tag)] } : {}),
    },
    children: [],
  }
}

export function createExampleRoot(): MindNode {
  return {
    data: {
      text: '智能生成需求内容',
      uid: createId(),
      expand: true,
    },
    children: [
      {
        data: {
          text: '子需求1:需求内容智能生成',
          uid: createId(),
          expand: true,
          tag: [createTag('需求')],
        },
        children: [
          {
            data: {
              text: '需求内容生成',
              uid: createId(),
              expand: true,
              tag: [createTag('模块')],
            },
            children: [
              createNode(
                '验证TAPD能否通过人工智能技术自动生成详细且准确的需求描述和文档',
                '测试点',
              ),
              createNode(
                '验证TAPD能否借助腾讯混元大模型自动生成详细且准确的需求描述和文档',
                '测试点',
              ),
              createNode(
                '验证需求内容生成功能是否能有效减少人工编写需求文档的工作量',
                '测试点',
              ),
              createNode(
                '验证自动生成的需求文档是否具有较高的一致性',
                '测试点',
              ),
              createNode(
                '验证自动生成的需求文档是否具有较高的质量',
                '测试点',
              ),
              createNode(
                '验证需求内容生成功能是否能提高需求文档的编写效率',
                '测试点',
              ),
              createNode(
                '验证自动生成的需求文档是否能满足项目开发的基础需求',
                '测试点',
              ),
            ],
          },
          createNode('需求文档编写', '模块'),
          createNode('编写效率提升', '模块'),
          createNode('文档质量保证', '模块'),
        ],
      },
      {
        data: {
          text: '节点编辑',
          uid: createId(),
          expand: true,
          tag: [createTag('模块')],
        },
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

export function getNodeTagLabel(root: MindNode, uid: string): TagLabel | '' {
  const node = findNode(root, uid)
  const firstTag = node?.data.tag?.[0]
  const label = typeof firstTag === 'string' ? firstTag : firstTag?.text
  return tagOptions.includes(label as TagLabel) ? (label as TagLabel) : ''
}

export function updateNodeTag(
  root: MindNode,
  uid: string,
  label: TagLabel | '',
): MindNode {
  return updateTree(root, uid, (node) => {
    const dataWithoutTag = { ...node.data }
    delete dataWithoutTag.tag
    return {
      ...node,
      data: {
        ...dataWithoutTag,
        ...(label ? { tag: [createTag(label)] } : {}),
      },
    }
  })
}

function findNode(root: MindNode, uid: string): MindNode | null {
  if (root.data.uid === uid) return root
  const children = root.children || []

  for (const child of children) {
    const match = findNode(child, uid)
    if (match) return match
  }

  return null
}

export function getNodeText(root: MindNode, uid: string): string {
  const node = findNode(root, uid)
  return node?.data?.text || ''
}

export function getNodeSystemPrompt(root: MindNode, uid: string): string {
  const node = findNode(root, uid)
  return node?.data?.nextSystemPrompt || ''
}

function aiNodeToMindNode(aiNode: AIGenerateNode): MindNode {
  return {
    data: {
      text: aiNode.data.text || '未命名节点',
      uid: createId(),
      expand: true,
      note: aiNode.data.note || '',
      nextSystemPrompt: aiNode.data.nextSystemPrompt || '',
      color: aiNode.data.color || '',
    },
    children: (aiNode.children || []).map(aiNodeToMindNode),
  }
}

export function addAIChildNodes(
  root: MindNode,
  uid: string,
  aiNodes: AIGenerateNode[],
): MindNode {
  const mindNodes = aiNodes.map(aiNodeToMindNode)
  return updateTree(root, uid, (node) => ({
    ...node,
    data: { ...node.data, expand: true },
    children: [...(node.children || []), ...mindNodes],
  }))
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
