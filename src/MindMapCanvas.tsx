import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { LayoutType, MindMapInstance, MindNode } from './types'

type MindMapConstructor = new (
  options: Record<string, unknown>,
) => MindMapInstance

const MIND_MAP_SCRIPT_ID = 'simple-mind-map-umd'
const MIND_MAP_SCRIPT_SRC = '/vendor/simpleMindMap.umd.min.js'

let mindMapScriptPromise: Promise<MindMapConstructor> | null = null

function resolveMindMapConstructor(): MindMapConstructor | null {
  const exported = window.simpleMindMap
  if (!exported) return null
  if (typeof exported === 'function') return exported
  return exported.default
}

function loadMindMapConstructor(): Promise<MindMapConstructor> {
  const existing = resolveMindMapConstructor()
  if (existing) return Promise.resolve(existing)
  if (mindMapScriptPromise) return mindMapScriptPromise

  mindMapScriptPromise = new Promise((resolve, reject) => {
    const currentScript = document.getElementById(MIND_MAP_SCRIPT_ID)

    if (currentScript) {
      currentScript.addEventListener('load', () => {
        const constructor = resolveMindMapConstructor()
        if (constructor) resolve(constructor)
        else reject(new Error('simple-mind-map UMD loaded without export'))
      })
      currentScript.addEventListener('error', () => {
        reject(new Error('Failed to load simple-mind-map UMD script'))
      })
      return
    }

    const script = document.createElement('script')
    script.id = MIND_MAP_SCRIPT_ID
    script.src = MIND_MAP_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      const constructor = resolveMindMapConstructor()
      if (constructor) resolve(constructor)
      else reject(new Error('simple-mind-map UMD loaded without export'))
    }
    script.onerror = () => {
      reject(new Error('Failed to load simple-mind-map UMD script'))
    }
    document.head.appendChild(script)
  })

  return mindMapScriptPromise
}

export interface MindMapCanvasHandle {
  getData: () => MindNode | null
  syncData: (root: MindNode) => void
  selectNode: (uid: string) => void
  addChild: () => void
  addSibling: () => void
  removeSelected: () => void
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
}

interface MindMapCanvasProps {
  docId: string
  root: MindNode
  layout: LayoutType
  onChange: (root: MindNode) => void
  onSelectNode: (uid: string | null) => void
}

function getNodeUid(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null
  const withGetData = node as { getData?: (key: string) => unknown }
  const uid = withGetData.getData?.('uid')
  return typeof uid === 'string' ? uid : null
}

export const MindMapCanvas = forwardRef<
  MindMapCanvasHandle,
  MindMapCanvasProps
>(({ docId, root, layout, onChange, onSelectNode }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mindMapRef = useRef<MindMapInstance | null>(null)
  const suppressChangeRef = useRef(false)
  const appliedDocIdRef = useRef<string | null>(null)

  const runWithoutChangeEvent = (operation: () => void) => {
    suppressChangeRef.current = true
    operation()
    window.setTimeout(() => {
      suppressChangeRef.current = false
    }, 0)
  }

  useImperativeHandle(ref, () => ({
    getData() {
      return mindMapRef.current?.getData(false) || null
    },
    syncData(nextRoot) {
      if (!mindMapRef.current) return
      runWithoutChangeEvent(() => {
        mindMapRef.current?.setData(nextRoot)
      })
    },
    selectNode(uid) {
      const mindMap = mindMapRef.current
      if (!mindMap) return
      mindMap.execCommand('GO_TARGET_NODE', uid)
    },
    addChild() {
      mindMapRef.current?.execCommand('INSERT_CHILD_NODE', false, [], {
        text: '新节点',
      })
    },
    addSibling() {
      mindMapRef.current?.execCommand('INSERT_NODE', false, [], {
        text: '新节点',
      })
    },
    removeSelected() {
      mindMapRef.current?.execCommand('REMOVE_NODE')
    },
    zoomIn() {
      mindMapRef.current?.view.enlarge()
    },
    zoomOut() {
      mindMapRef.current?.view.narrow()
    },
    fit() {
      mindMapRef.current?.view.fit()
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    const cleanupHandlers: Array<() => void> = []

    loadMindMapConstructor()
      .then((MindMap) => {
        if (cancelled || !containerRef.current) return

        const mindMap = new MindMap({
          el: containerRef.current,
          data: root,
          layout,
          fit: true,
          theme: 'default',
          maxTag: 2,
          tagsColorMap: {
            需求: '#3b82f6',
            模块: '#10b981',
            测试点: '#f97316',
          },
          defaultInsertSecondLevelNodeText: '新节点',
          defaultInsertBelowSecondLevelNodeText: '新节点',
          createNewNodeBehavior: 'activeOnly',
        })

        mindMapRef.current = mindMap
        appliedDocIdRef.current = docId

        const handleDataChange = (nextRoot: unknown) => {
          if (suppressChangeRef.current) return
          onChange(nextRoot as MindNode)
        }

        const handleNodeActive = (...args: unknown[]) => {
          const activeNodeList = Array.isArray(args[1]) ? args[1] : []
          const latest = activeNodeList[activeNodeList.length - 1]
          onSelectNode(getNodeUid(latest))
        }

        mindMap.on('data_change', handleDataChange)
        mindMap.on('node_active', handleNodeActive)

        const resizeObserver = new ResizeObserver(() => mindMap.resize())
        resizeObserver.observe(containerRef.current)

        cleanupHandlers.push(() => {
          resizeObserver.disconnect()
          mindMap.off('data_change', handleDataChange)
          mindMap.off('node_active', handleNodeActive)
          mindMap.destroy()
          mindMapRef.current = null
          appliedDocIdRef.current = null
        })
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      cancelled = true
      cleanupHandlers.forEach((cleanup) => cleanup())
    }
    // The canvas instance should be recreated only when switching documents.
    // Root updates are pushed through syncData to avoid destroying selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  useEffect(() => {
    mindMapRef.current?.setLayout(layout)
  }, [layout])

  useEffect(() => {
    const mindMap = mindMapRef.current
    if (!mindMap || appliedDocIdRef.current === docId) return

    runWithoutChangeEvent(() => {
      mindMap.setData(root)
      mindMap.setLayout(layout)
      mindMap.view.fit()
      appliedDocIdRef.current = docId
    })
  }, [docId, layout, root])

  return <div ref={containerRef} className="mindmap-canvas" />
})
