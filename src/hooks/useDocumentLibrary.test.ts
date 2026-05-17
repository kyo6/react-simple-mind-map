import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocumentLibrary } from './useDocumentLibrary'
import { listMindMaps, saveMindMap } from '../storage'
import { createDocument } from '../mindmapData'

vi.mock('../storage', () => ({
  listMindMaps: vi.fn(),
  saveMindMap: vi.fn(),
  deleteMindMap: vi.fn(),
}))

describe('useDocumentLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have loading=true initially and auto-load documents', async () => {
    const doc1 = createDocument('文档1')
    const doc2 = createDocument('文档2')
    vi.mocked(listMindMaps).mockResolvedValue([doc1, doc2])

    const { result } = await act(async () => {
      return renderHook(() => useDocumentLibrary())
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.documents).toHaveLength(2)
    expect(result.current.documents[0].title).toBe('文档1')
    expect(result.current.documents[1].title).toBe('文档2')
    expect(result.current.activeId).toBe(doc1.id)
  })

  it('should create default document when storage is empty', async () => {
    vi.mocked(listMindMaps).mockResolvedValue([])
    vi.mocked(saveMindMap).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDocumentLibrary())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.documents).toHaveLength(1)
    expect(result.current.documents[0].title).toBe('示例导图')
    expect(result.current.activeId).toBe(result.current.documents[0].id)
    expect(saveMindMap).toHaveBeenCalledTimes(1)
    expect(saveMindMap).toHaveBeenCalledWith(
      expect.objectContaining({ title: '示例导图' }),
    )
  })

  it('should call onLoad callback with first document', async () => {
    const doc1 = createDocument('文档1')
    vi.mocked(listMindMaps).mockResolvedValue([doc1])
    const onLoad = vi.fn()

    await act(async () => {
      renderHook(() => useDocumentLibrary({ onLoad }))
    })

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledWith(
      expect.objectContaining({ id: doc1.id, title: '文档1' }),
    )
  })

  it('should create new document and set it as active', async () => {
    const existingDoc = createDocument('现有文档')
    vi.mocked(listMindMaps).mockResolvedValue([existingDoc])

    const { result } = await act(async () => {
      return renderHook(() => useDocumentLibrary())
    })

    expect(result.current.documents).toHaveLength(1)
    expect(result.current.activeId).toBe(existingDoc.id)

    await act(async () => {
      await result.current.createDocument('新文档')
    })

    expect(result.current.documents).toHaveLength(2)
    expect(result.current.documents[0].title).toBe('新文档')
    expect(result.current.activeId).toBe(result.current.documents[0].id)
    expect(saveMindMap).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新文档' }),
    )
  })

  it('should rename a document and update its updatedAt', async () => {
    const doc = createDocument('旧名称')
    vi.mocked(listMindMaps).mockResolvedValue([doc])

    const { result } = await act(async () => {
      return renderHook(() => useDocumentLibrary())
    })

    const originalUpdatedAt = result.current.documents[0].updatedAt

    vi.useFakeTimers()
    vi.advanceTimersByTime(1000)

    await act(async () => {
      await result.current.renameDocument(doc.id, '新名称')
    })

    vi.useRealTimers()

    expect(result.current.documents[0].title).toBe('新名称')
    expect(result.current.documents[0].updatedAt).toBeGreaterThan(originalUpdatedAt)
    expect(saveMindMap).toHaveBeenCalledWith(
      expect.objectContaining({ id: doc.id, title: '新名称' }),
    )
  })

  it('should delete a non-active document', async () => {
    const doc1 = createDocument('文档1')
    const doc2 = createDocument('文档2')
    vi.mocked(listMindMaps).mockResolvedValue([doc1, doc2])

    const { result } = await act(async () => {
      return renderHook(() => useDocumentLibrary())
    })

    expect(result.current.documents).toHaveLength(2)
    expect(result.current.activeId).toBe(doc1.id)

    await act(async () => {
      await result.current.deleteDocument(doc2.id)
    })

    expect(result.current.documents).toHaveLength(1)
    expect(result.current.documents[0].id).toBe(doc1.id)
    expect(result.current.activeId).toBe(doc1.id)
  })

  it('should switch to next document when deleting active document', async () => {
    const doc1 = createDocument('文档1')
    const doc2 = createDocument('文档2')
    vi.mocked(listMindMaps).mockResolvedValue([doc1, doc2])
    const onActiveDocumentChange = vi.fn()

    const { result } = await act(async () => {
      return renderHook(() =>
        useDocumentLibrary({ onActiveDocumentChange }),
      )
    })

    expect(result.current.activeId).toBe(doc1.id)

    await act(async () => {
      await result.current.deleteDocument(doc1.id)
    })

    expect(result.current.documents).toHaveLength(1)
    expect(result.current.activeId).toBe(doc2.id)
    expect(onActiveDocumentChange).toHaveBeenCalledTimes(1)
    expect(onActiveDocumentChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: doc2.id, title: '文档2' }),
    )
  })
})
