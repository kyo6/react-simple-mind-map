import { useState, useCallback, useRef, useEffect } from 'react'
import { listMindMaps, saveMindMap, deleteMindMap } from '../storage'
import { createDocument, createExampleRoot } from '../mindmapData'
import type { MindMapDocument } from '../types'

interface UseDocumentLibraryOptions {
  onLoad?: (firstDoc: MindMapDocument) => void
  onActiveDocumentChange?: (doc: MindMapDocument | null) => void
}

interface UseDocumentLibraryResult {
  documents: MindMapDocument[]
  activeId: string | null
  loading: boolean
  setActiveId: (id: string) => void
  createDocument: (title: string) => Promise<void>
  renameDocument: (id: string, title: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  updateDocument: (doc: MindMapDocument) => void
}

export function useDocumentLibrary(
  options?: UseDocumentLibraryOptions,
): UseDocumentLibraryResult {
  const [documents, setDocuments] = useState<MindMapDocument[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const documentsRef = useRef<MindMapDocument[]>([])
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    documentsRef.current = documents
  }, [documents])

  useEffect(() => {
    let cancelled = false
    listMindMaps()
      .then((stored) => {
        if (cancelled) return
        const docs =
          stored.length > 0
            ? stored
            : [createDocument('示例导图', createExampleRoot())]

        if (stored.length === 0) {
          saveMindMap(docs[0]).catch((err) => console.error('保存文档失败:', err))
        }

        setDocuments(docs)
        setActiveId(docs[0].id)
        optionsRef.current?.onLoad?.(docs[0])
      })
      .catch((err) => {
        console.error('加载文档失败:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createNewDocument = useCallback(async (title: string) => {
    const doc = createDocument(title)
    await saveMindMap(doc)
    setDocuments((list) => [doc, ...list])
    setActiveId(doc.id)
  }, [])

  const renameDocument = useCallback(async (id: string, title: string) => {
    const updatedAt = Date.now()
    const updated = documentsRef.current.find((doc) => doc.id === id)
    if (!updated) return
    const updatedDoc = { ...updated, title, updatedAt }
    setDocuments((list) =>
      list.map((item) =>
        item.id === id ? updatedDoc : item,
      ),
    )
    await saveMindMap(updatedDoc)
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    await deleteMindMap(id)
    setDocuments((list) => {
      const nextList = list.filter((item) => item.id !== id)
      if (id === activeId && nextList.length > 0) {
        setActiveId(nextList[0].id)
        optionsRef.current?.onActiveDocumentChange?.(nextList[0])
      }
      return nextList
    })
  }, [activeId])

  const updateDocument = useCallback((updated: MindMapDocument) => {
    setDocuments((list) =>
      [updated, ...list.filter((doc) => doc.id !== updated.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    )
  }, [])

  return {
    documents,
    activeId,
    loading,
    setActiveId,
    createDocument: createNewDocument,
    renameDocument,
    deleteDocument,
    updateDocument,
  }
}
