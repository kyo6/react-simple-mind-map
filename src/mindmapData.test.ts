import { describe, it, expect } from 'vitest'
import {
  createNode,
  createBlankRoot,
  cloneRoot,
  ensureNodeIds,
  updateNodeText,
  addChildNode,
  removeNode,
  getNodeText,
} from './mindmapData'


describe('mindmapData', () => {
    // 默认文本、自定义文本、UID生成、展开状态
  describe('createNode', () => {
    it('should create a node with default text', () => {
      const node = createNode()
      expect(node.data.text).toBe('新节点')
      expect(node.data.uid).toBeDefined()
      expect(node.data.expand).toBe(true)
      expect(node.children).toEqual([])
    })

    it('should create a node with custom text', () => {
      const node = createNode('自定义节点')
      expect(node.data.text).toBe('自定义节点')
    })
  })
  // 指定标题、默认标题、UID生成
  describe('createBlankRoot', () => {
    it('should create a root node with given title', () => {
      const root = createBlankRoot('测试导图')
      expect(root.data.text).toBe('测试导图')
      expect(root.data.uid).toBeDefined()
      expect(root.children).toEqual([])
    })

    it('should use default title when not provided', () => {
      const root = createBlankRoot()
      expect(root.data.text).toBe('中心主题')
    })
  })

  // 深拷贝验证（值相等但引用不同）
  describe('cloneRoot', () => {
    it('should create a deep copy of the root', () => {
      const root = createBlankRoot('原始')
      const cloned = cloneRoot(root)

      expect(cloned).toEqual(root)
      expect(cloned).not.toBe(root)
      expect(cloned.data).not.toBe(root.data)
    })
  })

  // 为无UID节点添加ID、保留现有UID
  describe('ensureNodeIds', () => {
    it('should add uid to nodes without one', () => {
      const root = createBlankRoot('根节点')
      delete (root.data as Record<string, unknown>).uid
      root.children = [createNode('子节点')]
      delete (root.children[0].data as Record<string, unknown>).uid

      const result = ensureNodeIds(root)

      expect(result.data.uid).toBeDefined()
      expect(result.children![0].data.uid).toBeDefined()
    })

    it('should preserve existing uids', () => {
      const root = createBlankRoot('根')
      const originalUid = root.data.uid

      const result = ensureNodeIds(root)

      expect(result.data.uid).toBe(originalUid)
    })
  })

  // 更新目标节点文本、不可变性验证
  describe('updateNodeText', () => {
    it('should update text of the target node', () => {
      const root = createBlankRoot('根')
      const child = createNode('子节点')
      root.children = [child]

      const result = updateNodeText(root, child.data.uid!, '更新后的文本')

      expect(result.children![0].data.text).toBe('更新后的文本')
      expect(result.data.text).toBe('根')
    })

    it('should not mutate the original root', () => {
      const root = createBlankRoot('根')
      const child = createNode('子节点')
      root.children = [child]

      updateNodeText(root, child.data.uid!, '新文本')

      expect(root.children![0].data.text).toBe('子节点')
    })
  })

  // 添加子节点、自动展开父节点
  describe('addChildNode', () => {
    it('should add a child node to the target', () => {
      const root = createBlankRoot('根')

      const result = addChildNode(root, root.data.uid!)

      expect(result.children).toHaveLength(1)
      expect(result.children![0].data.text).toBe('新节点')
    })

    it('should expand the parent node', () => {
      const root = createBlankRoot('根')
      root.data.expand = false

      const result = addChildNode(root, root.data.uid!)

      expect(result.data.expand).toBe(true)
    })
  })

  // 删除指定子节点、清空根节点子节点
  describe('removeNode', () => {
    it('should remove the target child node', () => {
      const root = createBlankRoot('根')
      const child1 = createNode('子1')
      const child2 = createNode('子2')
      root.children = [child1, child2]

      const result = removeNode(root, child1.data.uid!)

      expect(result.children).toHaveLength(1)
      expect(result.children![0].data.text).toBe('子2')
    })

    it('should clear children when removing root', () => {
      const root = createBlankRoot('根')
      root.children = [createNode('子')]

      const result = removeNode(root, root.data.uid!)

      expect(result.data.text).toBe('根')
      expect(result.children).toEqual([])
    })
  })

  // 查找并返回节点文本、不存在返回空字符串
  describe('getNodeText', () => {
    it('should return text of the found node', () => {
      const root = createBlankRoot('根')
      const child = createNode('子节点')
      root.children = [child]

      const text = getNodeText(root, child.data.uid!)

      expect(text).toBe('子节点')
    })

    it('should return empty string for non-existent node', () => {
      const root = createBlankRoot('根')

      const text = getNodeText(root, 'non-existent')

      expect(text).toBe('')
    })
  })
})
