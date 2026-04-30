import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  addChildNode,
  addSiblingNode,
  createBlankRoot,
  cloneRoot,
  createExampleRoot,
  createId,
  ensureNodeIds,
  isValidMindMapRoot,
  layoutOptions,
  removeNode,
  toggleNodeExpand,
  updateNodeText,
} from './mindmapData'
import { MindMapCanvas, type MindMapCanvasHandle } from './MindMapCanvas'
import { OutlinePanel } from './OutlinePanel'
import { deleteMindMap, listMindMaps, saveMindMap } from './storage'
import type { LayoutType, MindMapDocument, MindNode } from './types'

function createDocument(title = '未命名导图', root = createBlankRoot(title)): MindMapDocument {
  const now = Date.now()
  return {
    id: createId(),
    title,
    root,
    layout: 'mindMap',
    createdAt: now,
    updatedAt: now,
  }
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function App() {
  const canvasRef = useRef<MindMapCanvasHandle | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [documents, setDocuments] = useState<MindMapDocument[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [currentRoot, setCurrentRoot] = useState<MindNode | null>(null)
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('mindMap')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeId) || null,
    [documents, activeId],
  )

  useEffect(() => {
    let mounted = true

    async function load() {
      const stored = await listMindMaps()
      const docs =
        stored.length > 0
          ? stored
          : [createDocument('示例导图', createExampleRoot())]

      if (stored.length === 0) {
        await saveMindMap(docs[0])
      }

      if (!mounted) return
      setDocuments(docs)
      setActiveId(docs[0].id)
      setCurrentRoot(cloneRoot(docs[0].root))
      setCurrentLayout(docs[0].layout)
      setLoading(false)
    }

    load().catch((error) => {
      console.error(error)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const confirmDiscard = () =>
    !dirty || window.confirm('当前导图有未保存修改，是否放弃？')

  const openDocument = (doc: MindMapDocument) => {
    if (doc.id === activeId) return
    if (!confirmDiscard()) return
    const nextRoot = cloneRoot(doc.root)
    setActiveId(doc.id)
    setCurrentRoot(nextRoot)
    setCurrentLayout(doc.layout)
    setSelectedUid(null)
    setDirty(false)
    canvasRef.current?.syncData(nextRoot)
  }

  const createNewDocument = async () => {
    if (!confirmDiscard()) return
    const title = window.prompt('请输入导图名称', '新导图')?.trim()
    if (!title) return

    const doc = createDocument(title)
    await saveMindMap(doc)
    const nextRoot = cloneRoot(doc.root)
    setDocuments((list) => [doc, ...list])
    setActiveId(doc.id)
    setCurrentRoot(nextRoot)
    setCurrentLayout(doc.layout)
    setSelectedUid(null)
    setDirty(false)
    canvasRef.current?.syncData(nextRoot)
  }

  const renameDocument = async (doc: MindMapDocument) => {
    const title = window.prompt('请输入新的导图名称', doc.title)?.trim()
    if (!title || title === doc.title) return

    const updated = { ...doc, title, updatedAt: Date.now() }
    await saveMindMap(updated)
    setDocuments((list) =>
      list.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  const removeDocument = async (doc: MindMapDocument) => {
    if (doc.id === activeId && !confirmDiscard()) return
    if (!window.confirm(`确认删除「${doc.title}」吗？`)) return

    await deleteMindMap(doc.id)
    const nextList = documents.filter((item) => item.id !== doc.id)
    setDocuments(nextList)

    if (doc.id === activeId) {
      const nextDoc = nextList[0] || createDocument('示例导图')
      if (nextList.length === 0) {
        await saveMindMap(nextDoc)
        setDocuments([nextDoc])
      }
      const nextRoot = cloneRoot(nextDoc.root)
      setActiveId(nextDoc.id)
      setCurrentRoot(nextRoot)
      setCurrentLayout(nextDoc.layout)
      setSelectedUid(null)
      setDirty(false)
      canvasRef.current?.syncData(nextRoot)
    }
  }

  const saveCurrentDocument = async () => {
    if (!activeDocument || !currentRoot) return
    const root = canvasRef.current?.getData() || currentRoot
    const updated: MindMapDocument = {
      ...activeDocument,
      root: ensureNodeIds(root),
      layout: currentLayout,
      updatedAt: Date.now(),
    }

    await saveMindMap(updated)
    setDocuments((list) =>
      [updated, ...list.filter((doc) => doc.id !== updated.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    )
    setCurrentRoot(cloneRoot(updated.root))
    setDirty(false)
  }

  const applyRootChange = (root: MindNode) => {
    const nextRoot = ensureNodeIds(root)
    setCurrentRoot(nextRoot)
    canvasRef.current?.syncData(nextRoot)
    setDirty(true)
  }

  const handleCanvasChange = (root: MindNode) => {
    setCurrentRoot(ensureNodeIds(root))
    setDirty(true)
  }

  const changeLayout = (layout: LayoutType) => {
    setCurrentLayout(layout)
    setDirty(true)
  }

  const importJson = async (file: File | undefined) => {
    if (!file || !currentRoot) return
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    const root = isValidMindMapRoot(parsed)
      ? parsed
      : typeof parsed === 'object' &&
          parsed !== null &&
          'root' in parsed &&
          isValidMindMapRoot((parsed as { root: unknown }).root)
        ? (parsed as { root: MindNode }).root
        : null

    if (!root) {
      window.alert('JSON 格式无效：需要 simple-mind-map 原生节点结构。')
      return
    }

    applyRootChange(root)
    importInputRef.current!.value = ''
  }

  const selected = Boolean(selectedUid)

  if (loading || !currentRoot || !activeDocument) {
    return <main className="loading">正在加载导图...</main>
  }

  return (
    <main className="app-shell">
      <aside className="library-panel">
        <div className="brand-block">
          <div>
            <span className="eyebrow">IndexedDB Demo</span>
            <h1>Mindmaps</h1>
          </div>
          <button type="button" className="primary-button" onClick={createNewDocument}>
            新建
          </button>
        </div>

        <div className="document-list">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className={`document-item ${doc.id === activeId ? 'active' : ''}`}
            >
              <button type="button" onClick={() => openDocument(doc)}>
                <strong>{doc.title}</strong>
                <span>{new Date(doc.updatedAt).toLocaleString()}</span>
              </button>
              <div className="document-actions">
                <button type="button" onClick={() => renameDocument(doc)}>
                  改名
                </button>
                <button type="button" onClick={() => removeDocument(doc)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className={`save-state ${dirty ? 'dirty' : ''}`}>
              {dirty ? '未保存' : '已保存'}
            </span>
            <h2>{activeDocument.title}</h2>
          </div>

          <div className="toolbar">
            <select
              value={currentLayout}
              onChange={(event) => changeLayout(event.target.value as LayoutType)}
            >
              {layoutOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => canvasRef.current?.addChild()} disabled={!selected}>
              子节点
            </button>
            <button type="button" onClick={() => canvasRef.current?.addSibling()} disabled={!selected}>
              同级
            </button>
            <button type="button" onClick={() => canvasRef.current?.removeSelected()} disabled={!selected}>
              删除
            </button>
            <button type="button" onClick={() => canvasRef.current?.zoomOut()}>
              缩小
            </button>
            <button type="button" onClick={() => canvasRef.current?.zoomIn()}>
              放大
            </button>
            <button type="button" onClick={() => canvasRef.current?.fit()}>
              适应
            </button>
            <button type="button" onClick={() => importInputRef.current?.click()}>
              导入 JSON
            </button>
            <button
              type="button"
              onClick={() => downloadJson(`${activeDocument.title}.json`, currentRoot)}
            >
              导出 JSON
            </button>
            <button type="button" className="primary-button" onClick={saveCurrentDocument}>
              保存
            </button>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              importJson(event.target.files?.[0]).catch((error) => {
                window.alert(`导入失败：${String(error)}`)
              })
            }}
          />
        </header>

        <div className="editor-grid">
          <div className="canvas-panel">
            <MindMapCanvas
              key={activeDocument.id}
              ref={canvasRef}
              docId={activeDocument.id}
              root={currentRoot}
              layout={currentLayout}
              onChange={handleCanvasChange}
              onSelectNode={setSelectedUid}
            />
          </div>

          <OutlinePanel
            root={currentRoot}
            selectedUid={selectedUid}
            onSelect={(uid) => {
              setSelectedUid(uid)
              canvasRef.current?.selectNode(uid)
            }}
            onRename={(uid, text) => applyRootChange(updateNodeText(currentRoot, uid, text))}
            onAddChild={(uid) => applyRootChange(addChildNode(currentRoot, uid))}
            onAddSibling={(uid) => applyRootChange(addSiblingNode(currentRoot, uid))}
            onDelete={(uid) => applyRootChange(removeNode(currentRoot, uid))}
            onToggle={(uid) => applyRootChange(toggleNodeExpand(currentRoot, uid))}
          />
        </div>
      </section>
    </main>
  )
}

export default App
