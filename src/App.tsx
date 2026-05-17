import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { message } from 'antd'
import './App.css'
import {
  addChildNode,
  addAIChildNodes,
  addSiblingNode,
  cloneRoot,
  createBlankRoot,
  ensureNodeIds,
  getNodeTagLabel,
  isValidMindMapRoot,
  layoutOptions,
  removeNode,
  tagOptions,
  toggleNodeExpand,
  updateNodeTag,
  updateNodeText,
  type TagLabel,
} from './mindmapData'
import { MindMapCanvas, type MindMapCanvasHandle } from './MindMapCanvas'
import { OutlinePanel } from './OutlinePanel'
import { saveMindMap, loadAISettings } from './storage'
import { useAIGenerate } from './useAIGenerate'
import { useDocumentLibrary } from './hooks/useDocumentLibrary'
import { AISettingsDrawer } from './AISettingsDrawer'
import { ThinkingModelDrawer } from './ThinkingModelDrawer'
import type { LayoutType, MindMapDocument, MindNode, AISettings, AIGenerateNode } from './types'
import { DEFAULT_AI_SETTINGS } from './types'
import { extractIdeas } from './libai'

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
  const [currentRoot, setCurrentRoot] = useState<MindNode | null>(null)
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('mindMap')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS)
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [thinkingModelDrawerOpen, setThinkingModelDrawerOpen] = useState(false)

  const onLoad = useCallback((firstDoc: MindMapDocument) => {
    setCurrentRoot(cloneRoot(firstDoc.root))
    setCurrentLayout(firstDoc.layout)
  }, [])

  const onActiveDocumentChange = useCallback((doc: MindMapDocument | null) => {
    if (!doc) return
    setCurrentRoot(cloneRoot(doc.root))
    setCurrentLayout(doc.layout)
    setSelectedUid(null)
    setDirty(false)
  }, [])

  const {
    documents,
    activeId,
    loading,
    setActiveId,
    createDocument,
    renameDocument,
    deleteDocument,
    updateDocument,
  } = useDocumentLibrary({
    onLoad,
    onActiveDocumentChange,
  })

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeId) || null,
    [documents, activeId],
  )

  useEffect(() => {
    loadAISettings().then((savedSettings) => {
      if (savedSettings) {
        setAISettings(savedSettings)
      }
    }).catch(console.error)
  }, [])

  const confirmDiscard = () =>
    !dirty || window.confirm('当前导图有未保存修改，是否放弃？')

  const openDocument = (doc: MindMapDocument) => {
    if (doc.id === activeId) return
    if (!confirmDiscard()) return
    setActiveId(doc.id)
    setCurrentRoot(cloneRoot(doc.root))
    setCurrentLayout(doc.layout)
    setSelectedUid(null)
    setDirty(false)
  }

  const handleCreateDocument = async () => {
    if (!confirmDiscard()) return
    const title = window.prompt('请输入导图名称', '新导图')?.trim()
    if (!title) return
    await createDocument(title)
    setCurrentRoot(createBlankRoot(title))
    setCurrentLayout('mindMap')
    setSelectedUid(null)
    setDirty(false)
  }

  const handleRenameDocument = async (doc: MindMapDocument) => {
    const title = window.prompt('请输入新的导图名称', doc.title)?.trim()
    if (!title || title === doc.title) return
    await renameDocument(doc.id, title)
  }

  const handleDeleteDocument = async (doc: MindMapDocument) => {
    if (doc.id === activeId && !confirmDiscard()) return
    if (!window.confirm(`确认删除「${doc.title}」吗？`)) return
    await deleteDocument(doc.id)
  }

  const saveCurrentDocument = async () => {
    if (!activeDocument || !currentRoot) return
    const updated: MindMapDocument = {
      ...activeDocument,
      root: ensureNodeIds(currentRoot),
      layout: currentLayout,
      updatedAt: Date.now(),
    }

    await saveMindMap(updated)
    updateDocument(updated)
    setDirty(false)
  }

  const applyRootChange = useCallback((root: MindNode) => {
    setCurrentRoot(ensureNodeIds(root))
    setDirty(true)
  }, [])

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

  const handleAISettingsChange = (settings: AISettings) => {
    setAISettings(settings)
  }

  const handleLoadTemplate = async (url: string) => {
    try {
      const res = await fetch(url)
      const text = await res.text()
      const parsed = JSON.parse(text)
      const ideas: AIGenerateNode[] = Array.isArray(parsed) ? parsed : extractIdeas(parsed)
      if (!Array.isArray(ideas) || ideas.length === 0) {
        message.warning('模板数据为空')
        return
      }
      if (!selectedUid) {
        message.warning('请先选中一个节点')
        return
      }
      const newRoot = addAIChildNodes(currentRoot!, selectedUid, ideas)
      applyRootChange(newRoot)
      message.success('模板加载成功')
    } catch {
      message.error('模板加载失败')
    }
  }

  const { isGenerating, generate } = useAIGenerate({
    settings: aiSettings,
    currentRoot: currentRoot!,
    selectedUid,
    onRootChange: applyRootChange,
  })

  const handleAIGenerate = async () => {
    try {
      await generate()
      message.success('AI 生成完成')
    } catch (err) {
      message.error(String(err))
    }
  }

  const selected = Boolean(selectedUid)
  if (loading || !currentRoot || !activeDocument) {
    return <main className="loading">正在加载导图...</main>
  }

  const selectedTag = selectedUid
    ? getNodeTagLabel(currentRoot, selectedUid)
    : ''

  return (
    <main className="app-shell">
      <aside className="library-panel">
        <div className="brand-block">
          <div>
            <span className="eyebrow">IndexedDB Demo</span>
            <h1>Mindmaps</h1>
          </div>
          <button type="button" className="primary-button" onClick={handleCreateDocument}>
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
                <button type="button" onClick={() => handleRenameDocument(doc)}>
                  改名
                </button>
                <button type="button" onClick={() => handleDeleteDocument(doc)}>
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
            <select
              value={selectedTag}
              disabled={!selectedUid}
              onChange={(event) =>
                applyRootChange(
                  updateNodeTag(
                    currentRoot,
                    selectedUid!,
                    event.target.value as TagLabel | '',
                  ),
                )
              }
            >
              <option value="">无标签</option>
              {tagOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
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
            <button
              type="button"
              className="ai-generate-button"
              disabled={!selected || isGenerating}
              onClick={handleAIGenerate}
            >
              {isGenerating ? '生成中...' : 'AI 生成'}
            </button>
            <button
              type="button"
              onClick={() => setThinkingModelDrawerOpen(true)}
              title="思维模型"
            >
              思维模型
            </button>
            <button
              type="button"
              onClick={() => setSettingsDrawerOpen(true)}
              title="AI 设置"
            >
              AI 设置
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

      <AISettingsDrawer
        open={settingsDrawerOpen}
        settings={aiSettings}
        onSettingsChange={handleAISettingsChange}
        onClose={() => setSettingsDrawerOpen(false)}
      />

      <ThinkingModelDrawer
        open={thinkingModelDrawerOpen}
        settings={aiSettings}
        onSettingsChange={handleAISettingsChange}
        onClose={() => setThinkingModelDrawerOpen(false)}
        onLoadTemplate={handleLoadTemplate}
      />
    </main>
  )
}

export default App
