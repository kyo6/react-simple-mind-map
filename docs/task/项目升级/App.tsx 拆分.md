好的，我已经完整阅读了 `App.tsx` 以及相关的核心模块（types、storage、useAIGenerate、mindmapData、MindMapCanvas）。下面我从 **代码质量**、**状态管理** 和 **职责划分** 三个维度，系统地分析存在的问题，并给出具体的重构建议。

---

## 一、核心问题总览

`App.tsx` 目前是一个 **482 行的"上帝组件"（God Component）**，它同时承担了：

| 职责领域 | 当前状态 |
|---------|---------|
| **文档库管理** | 增删改查、列表排序、本地存储同步 |
| **当前文档编辑** | 节点增删改、标签切换、布局切换、脏状态追踪 |
| **画布控制** | 缩放、适应、选中节点、指令透传 |
| **AI 集成** | 设置管理、模板加载、生成调用 |
| **导入导出** | JSON 序列化/反序列化、文件下载 |
| **UI 状态** | 多个 Drawer 的显隐控制 |

这导致组件 **接口极浅**（几乎所有行为都暴露在 JSX 事件处理器中），**测试极其困难**（需要渲染整个应用才能测试文档保存逻辑），**变更局部性差**（修改 AI 功能可能意外破坏文档管理）。

---

## 二、具体问题分析

### 1. 状态过度集中（State Bloat）

App.tsx 中声明了 **10 个 useState**，这些状态属于不同的业务领域，却被混在同一个组件中：

```tsx
// 文档库状态
const [documents, setDocuments] = useState<MindMapDocument[]>([])
const [activeId, setActiveId] = useState<string | null>(null)

// 当前编辑状态
const [currentRoot, setCurrentRoot] = useState<MindNode | null>(null)
const [currentLayout, setCurrentLayout] = useState<LayoutType>('mindMap')
const [selectedUid, setSelectedUid] = useState<string | null>(null)
const [dirty, setDirty] = useState(false)

// 加载状态
const [loading, setLoading] = useState(true)

// AI 设置状态
const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS)

// UI 状态
const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
const [thinkingModelDrawerOpen, setThinkingModelDrawerOpen] = useState(false)
```

**问题：**
- 不同领域的状态变更逻辑互相穿插（如 `removeDocument` 既要操作文档列表，又要处理当前文档切换）
- 难以追踪状态一致性（`currentRoot` 和 `activeDocument.root` 可能不同步）
- 无法独立测试某个领域的状态逻辑

### 2. 职责划分混乱：画布状态 vs 文档状态

存在 **两套并行的数据流**：

```tsx
// 数据流 A：React 状态
const [currentRoot, setCurrentRoot] = useState<MindNode | null>(null)

// 数据流 B：Canvas 内部状态（通过 ref 访问）
const canvasRef = useRef<MindMapCanvasHandle | null>(null)

// 保存时从 canvas 读取（可能和 React 状态不一致！）
const root = canvasRef.current?.getData() || currentRoot
```

**问题：**
- `saveCurrentDocument` 时优先从 canvas 读取数据，这意味着 React 状态可能不是"真相源"
- `applyRootChange` 既要更新 React 状态，又要调用 `canvasRef.current?.syncData()`，形成双向同步
- 这种设计让数据流难以预测，容易产生 bug

### 3. 事件处理函数过于庞大

以 `removeDocument` 为例（约 25 行），它混合了：
- 脏状态检查
- 用户确认
- 存储删除
- 列表更新
- 当前文档自动切换
- Canvas 同步

```tsx
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
```

### 4. AI 逻辑与文档管理强耦合

AI 相关的状态和逻辑分散在多个地方：
- `aiSettings` 状态在 App.tsx 中管理
- `useAIGenerate` hook 接收 `currentRoot` 和 `onRootChange`
- `handleLoadTemplate` 直接操作 `currentRoot` 和 `selectedUid`
- AI Settings 的持久化在 `storage.ts` 中，但加载逻辑在 App.tsx 的 `useEffect` 中

### 5. 重复的模式：applyRootChange

几乎所有节点操作都遵循同一模式：

```tsx
onRename={(uid, text) => applyRootChange(updateNodeText(currentRoot, uid, text))}
onAddChild={(uid) => applyRootChange(addChildNode(currentRoot, uid))}
onAddSibling={(uid) => applyRootChange(addSiblingNode(currentRoot, uid))}
onDelete={(uid) => applyRootChange(removeNode(currentRoot, uid))}
onToggle={(uid) => applyRootChange(toggleNodeExpand(currentRoot, uid))}
```

这说明 **节点操作的状态更新逻辑** 应该被封装，而不是在每个事件处理器中重复。

---

## 三、重构建议：提取深度模块

基于以上分析，我建议将 `App.tsx` 拆分为以下 **深度模块**（Deep Modules）：

### 建议 1：提取 `useDocumentLibrary` Hook

**职责：** 管理文档列表、当前激活文档、CRUD 操作

```tsx
// hooks/useDocumentLibrary.ts
interface UseDocumentLibraryResult {
  documents: MindMapDocument[]
  activeDocument: MindMapDocument | null
  loading: boolean
  createDocument: (title: string) => Promise<void>
  renameDocument: (id: string, title: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  openDocument: (id: string) => Promise<boolean> // 返回是否成功切换
  saveDocument: (doc: MindMapDocument) => Promise<void>
}
```

**收益：**
- 文档库逻辑可独立测试（无需渲染 React 组件）
- `App.tsx` 不再关心 IndexedDB 操作细节
- 脏状态检查和确认逻辑可以封装在 `openDocument` 中

### 建议 2：提取 `useCurrentDocument` Hook

**职责：** 管理当前文档的编辑状态（root、layout、selectedUid、dirty）

```tsx
// hooks/useCurrentDocument.ts
interface UseCurrentDocumentResult {
  root: MindNode
  layout: LayoutType
  selectedUid: string | null
  dirty: boolean
  setRoot: (root: MindNode) => void
  setLayout: (layout: LayoutType) => void
  setSelectedUid: (uid: string | null) => void
  markDirty: () => void
  resetDocument: (doc: MindMapDocument) => void
  // 节点操作
  updateNodeText: (uid: string, text: string) => void
  addChildNode: (uid: string) => void
  addSiblingNode: (uid: string) => void
  removeNode: (uid: string) => void
  toggleExpand: (uid: string) => void
  updateTag: (uid: string, tag: TagLabel | '') => void
}
```

**收益：**
- 所有节点操作集中管理，不再需要在 JSX 中写 `applyRootChange(updateNodeText(...))`
- 脏状态自动追踪（任何 setRoot 调用自动标记 dirty）
- Canvas 和 OutlinePanel 可以共享同一套操作接口

### 建议 3：提取 `useAI` Hook（合并 AI 相关逻辑）

当前 `useAIGenerate` 只封装了生成逻辑，但 AI 设置和模板加载还在 App.tsx。建议扩展为：

```tsx
// hooks/useAI.ts
interface UseAIResult {
  settings: AISettings
  isGenerating: boolean
  updateSettings: (settings: AISettings) => void
  generate: (root: MindNode, selectedUid: string) => Promise<MindNode>
  loadTemplate: (url: string) => Promise<AIGenerateNode[]>
}
```

**收益：**
- AI 设置加载/保存逻辑从 App.tsx 移除
- 生成结果以数据形式返回，由调用方决定如何更新状态
- 模板加载和解析逻辑集中管理

### 建议 4：统一数据流——React 状态作为唯一真相源

当前问题：`saveCurrentDocument` 时从 canvas 读取数据，破坏了 React 的单向数据流。

**建议方案：**
- Canvas 组件改为 **完全受控组件**，只接收 `root` prop，所有变更通过 `onChange` 回调
- 移除 `canvasRef.current?.getData()` 的用法
- `MindMapCanvas` 的 `syncData` 只在需要抑制循环更新时使用（如外部撤销/重做）

```tsx
// 理想的数据流
// User Action -> update mindmapData function -> setRoot(newRoot) 
// -> React re-renders -> Canvas receives new root prop
```

### 建议 5：提取纯函数模块处理导入导出

当前 `importJson` 和 `downloadJson` 是散落在组件中的函数，建议提取为：

```tsx
// lib/importExport.ts
export function parseMindMapJson(text: string): MindNode | null
export function exportMindMapJson(title: string, root: MindNode): void
```

---

## 四、重构后的模块结构

```
src/
├── App.tsx                    # 仅负责组合子组件，传递 props
├── components/
│   ├── LibraryPanel.tsx       # 文档库侧边栏
│   ├── Workspace.tsx          # 工作区布局
│   ├── Toolbar.tsx            # 顶部工具栏
│   ├── MindMapCanvas.tsx      # 画布（受控组件）
│   └── OutlinePanel.tsx       # 大纲面板
├── hooks/
│   ├── useDocumentLibrary.ts  # 文档库状态管理
│   ├── useCurrentDocument.ts  # 当前文档编辑状态
│   └── useAI.ts               # AI 设置与生成
├── lib/
│   ├── mindmapData.ts         # 纯函数：节点操作
│   ├── importExport.ts        # 纯函数：导入导出
│   └── ai.ts                  # 纯函数：AI 请求（现有 libai.ts）
├── storage.ts                 # IndexedDB 封装（已较好）
└── types.ts                   # 类型定义
```

---

## 五、优先级建议

| 优先级 | 重构项 | 理由 |
|-------|--------|------|
| **P0** | 提取 `useDocumentLibrary` | 最直接减少 App.tsx 代码量，逻辑最独立 |
| **P0** | 提取 `useCurrentDocument` | 解决节点操作重复模式，统一数据流 |
| **P1** | 统一数据流（移除 canvas getData） | 消除潜在的数据不一致 bug |
| **P1** | 合并 AI 逻辑到 `useAI` | 减少 App.tsx 中跨领域的状态依赖 |
| **P2** | 提取 UI 子组件 | 提升可读性，但业务价值较低 |

---

你想先从哪个重构点开始？我可以帮你：
1. **提取 `useDocumentLibrary` hook**
2. **提取 `useCurrentDocument` hook**  
3. **统一 Canvas 数据流**（改为完全受控）

或者你想让我直接开始实施某个重构？