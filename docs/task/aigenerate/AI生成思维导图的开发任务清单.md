# AI 生成思维导图 - 开发任务清单

> 将 SimpleMind（Vue 3）中的 AI 生成思维导图功能迁移至 React 项目的任务拆解。

---

## 一、基础设施搭建

### 1.1 项目依赖安装

- [ ] 安装 HTTP 请求库（推荐 `ky` 或 `axios`，当前项目使用原生 `fetch`）
- [ ] 安装 `jsonrepair` 用于 AI 返回 JSON 的容错修复
- [ ] 安装思维导图渲染库（当前项目使用 `simple-mind-map`，确认 React 兼容性或选择替代方案）
- [ ] 安装 UI 组件库（当前项目使用 Ant Design Vue，React 项目对应 `antd`）

### 1.2 类型定义

- [ ] 定义 `MindMapNode` 类型：`{ data: { text: string; note: string; nextSystemPrompt: string; color: string }; children: MindMapNode[] }`
- [ ] 定义 `AISettings` 类型：`{ api: string; secret: string; model: string; depth: number; temperature: number; thinkingModel: string; systemPrompt: string; language: string }`
- [ ] 定义 `ThinkingModel` 类型：`{ label: string; value: string; description: string; prompt: string; example: { name: string; content: string }[] }`
- [ ] 定义 `AIResponse` 类型：兼容 OpenAI 标准格式与国产模型格式

---

## 二、核心模块迁移

### 2.1 AI 服务模块（对应 `src/libai.js`）

- [ ] **`buildPrompt()`** — Prompt 构建函数
  - 输入参数：`topic, count, nextSystemPrompt, systemPrompt, settings`
  - 拼接 6 大模块：Context & Data → Role Definition → Thinking Model → Output Examples → Rules → Task
  - 支持 `nextSystemPrompt` 递进提示注入
  - 支持思维模型模板注入
  - 支持节点数量范围约束（count ~ count×2）
  - 支持输出语言控制
- [ ] **`extractIdeas()`** — AI 响应解析函数
  - 多路径内容提取：`choices[0].message.content` / `output_text` / `text` / 原始字符串
  - Markdown 围栏清理（去除 ` ```json ` 和 ` ``` `）
  - JSON 解析 + `jsonrepair` 容错修复
  - Object 兼容处理（提取 `children` 或 `data` 字段）
- [ ] **`requestCompletions()`** — AI 请求函数
  - 端点拼接：`api + '/chat/completions'`
  - 请求头构造：`Content-Type` + `Authorization: Bearer`
  - 请求体构造：`model, messages, temperature, max_tokens, enable_thinking`
  - 响应格式兼容：JSON / 纯文本
- [ ] **`resolveEndpoint()`** — 端点解析函数
  - 拼接 `/chat/completions` 路径
- [ ] **`normalizeSecret()`** — 密钥处理函数
  - `my-` 前缀检测与 Base64 解码
  - URL-safe Base64 兼容
  - Padding 补齐
  - 解码失败回退原始值
- [ ] **`expandPrompt()`** — 提示词扩写函数
  - 调用 AI 优化和扩写系统提示词

### 2.2 常量与配置模块（对应 `src/const.js`）

- [ ] **思维模型列表** `thinkingModels`
  - 任意（default）
  - 第一性原理（first-principles）
  - 批判性思维（critical-thinking）
  - 贝叶斯思维（bayesian-thinking）
  - 费马法则（fermats-law）
  - 笔记法（note-taking）
  - 代码生成（code-generation）
  - 课程学习（course-learning）
  - 每个模型包含：`label, value, description, prompt, example[]`
- [ ] **布局选项** `layouts`：思维导图 / 逻辑结构图 / 组织结构图 / 目录组织图 / 时间轴 / 鱼骨图
- [ ] **语言选项** `languageOptions`：中文 / English
- [ ] **模型选项** `modelOptions`：可选 AI 模型列表
- [ ] **主题列表** `themeList`：思维导图主题配置

### 2.3 国际化模块（对应 `src/locales/`）

- [ ] 中文语言包 `zh-CN.json`（AI 相关 key 共 10+ 条）
- [ ] 英文语言包 `en-US.json`
- [ ] i18n 集成（推荐 `react-i18next` 或 `i18next`）

---

## 三、React 组件开发

### 3.1 AI 生成按钮组件

- [ ] 按钮状态管理：默认 / 生成中（loading）/ 禁用
- [ ] 点击事件处理：调用 `aiGenerate` 逻辑
- [ ] 防重复提交：`isGenerating` 状态锁

### 3.2 AI 生成主逻辑 Hook（`useAIGenerate`）

- [ ] 状态管理：`isGenerating`
- [ ] 前置校验：API 配置 / 思维导图实例 / 选中节点文本
- [ ] 获取选中节点信息：`text` + `nextSystemPrompt`
- [ ] 调用 `buildPrompt()` 构建 Prompt
- [ ] 调用 `requestCompletions()` 发起请求
- [ ] 调用 `extractIdeas()` 解析响应
- [ ] 调用思维导图实例的 `INSERT_MULTI_CHILD_NODE` 命令插入节点
- [ ] 错误处理与用户提示
- [ ] Loading 状态管理（显示/隐藏）

### 3.3 设置面板组件

- [ ] **基础设置 Tab**
  - [ ] API Base 输入框
  - [ ] 密钥输入框
  - [ ] 模型选择器（支持搜索）
  - [ ] 生成节点数输入框（1-20，默认 5）
  - [ ] 语言选择器
  - [ ] 主题选择器
  - [ ] 字体选择器
  - [ ] 连线样式选择器（曲线 / 直线 / 直连）
  - [ ] 布局选择器
- [ ] **知识库 Tab**
  - [ ] 系统提示词文本域
  - [ ] 文件上传（`.md` / `.txt` / `.pdf`）自动填充
  - [ ] 提示词扩写按钮（调用 `expandPrompt`）
- [ ] 设置持久化（localStorage）

### 3.4 思维模型抽屉组件

- [ ] 模型列表渲染（Radio 选择）
- [ ] 模型描述与原理展示
- [ ] 示例模板加载按钮
- [ ] 模型切换时更新 `settings.thinkingModel`

### 3.5 思维导图容器组件

- [ ] 初始化思维导图实例
- [ ] 节点选中事件监听（获取 `activeNodes`）
- [ ] 提供 `INSERT_MULTI_CHILD_NODE` 命令接口
- [ ] 节点数据获取接口（`getData()`）
- [ ] 主题配置应用

---

## 四、辅助功能迁移

### 4.1 文件解析模块（对应 `src/parser.js`）

- [ ] `.md` / `.txt` 文件解析为文本
- [ ] `.pdf` 文件解析为文本
- [ ] 解析结果填充到系统提示词

### 4.2 存储模块（对应 `src/storage.js`）

- [ ] `loadSettings()` — 从 localStorage 加载设置
- [ ] `saveSettings()` — 保存设置到 localStorage
- [ ] `loadMindMapData()` — 加载思维导图数据
- [ ] 设置项字段：`api, secret, model, depth, temperature, thinkingModel, systemPrompt, language, theme, layout, fontFamily, lineStyle, backgroundColor, lineColor, lineWidth, themeRootFillColor`

### 4.3 工具函数（对应 `src/utils.js`）

- [ ] `showError(title, message)` — 错误提示
- [ ] `showLoading(title, content)` — 加载提示
- [ ] `hideLoading()` — 隐藏加载提示
- [ ] `getNodeText(node)` — 获取节点文本
- [ ] `getNodeSystemPrompt(node)` — 获取节点递进提示

---

## 五、Prompt 工程迁移要点

### 5.1 Prompt 模板结构（必须严格保持一致）

```
① Context & Data（可选）— 用户知识库
② Role Definition — 角色定义
③ Thinking Model（可选）— 思维模型注入
④ Output Examples — JSON 数组示例
⑤ Rules — 约束规则
⑥ Task — 任务指令
```

### 5.2 关键约束规则

| 规则 | 约束 |
|------|------|
| 输出格式 | JSON 数组 |
| 结构层数 | 2 层（第一层 + children） |
| 第一层节点数 | count ~ count×2 |
| children 节点数 | count ~ count×2 |
| text 长度 | 20-50 字 |
| note 长度 | 40-200 字 |
| nextSystemPrompt 长度 | 30-60 字 |
| color 格式 | Hex 码，RGB 各值 < 200 |

### 5.3 递进生成机制

- 每个生成节点包含 `nextSystemPrompt` 字段
- 用户在子节点上再次触发 AI 生成时，该字段作为"思考方向"传入下一轮 Prompt
- 实现**逐层深入、方向可控**的无限递进展开

---

## 六、API 兼容性

### 6.1 请求格式

```json
POST {api_base}/chat/completions
Headers:
  Content-Type: application/json
  Authorization: Bearer {secret}

Body:
{
  "model": "gpt-5",
  "messages": [{ "role": "user", "content": "{prompt}" }],
  "temperature": 0.7,
  "max_tokens": 32000,
  "enable_thinking": false
}
```

### 6.2 响应格式兼容

| 格式 | 提取路径 |
|------|----------|
| OpenAI 标准 | `choices[0].message.content` |
| 国产模型 A | `output_text` |
| 国产模型 B | `text` |
| 纯字符串 | 直接使用 |

---

## 七、测试任务

### 7.1 单元测试

- [ ] `buildPrompt()` — 验证各模块拼接正确性
- [ ] `buildPrompt()` — 无 systemPrompt 时不输出 Context 模块
- [ ] `buildPrompt()` — 无 thinkingModel 时不输出 Thinking Model 模块
- [ ] `extractIdeas()` — 标准 JSON 解析
- [ ] `extractIdeas()` — Markdown 围栏清理
- [ ] `extractIdeas()` — `jsonrepair` 容错修复
- [ ] `extractIdeas()` — Object 类型兼容（提取 children）
- [ ] `resolveEndpoint()` — 端点拼接
- [ ] `normalizeSecret()` — 普通密钥原样返回
- [ ] `normalizeSecret()` — `my-` 前缀 Base64 解码
- [ ] `normalizeSecret()` — URL-safe Base64 兼容
- [ ] `normalizeSecret()` — 解码失败回退

### 7.2 集成测试

- [ ] AI 生成完整流程：选中节点 → 生成 → 插入子节点
- [ ] 递进生成：在 AI 生成的子节点上再次生成
- [ ] 错误场景：API 未配置 / 节点为空 / 请求失败 / JSON 解析失败
- [ ] 思维模型切换后生成结果差异
- [ ] 系统提示词对生成结果的影响

### 7.3 E2E 测试

- [ ] 用户完整操作流程：配置 API → 选择节点 → 点击生成 → 查看结果
- [ ] 设置持久化：刷新页面后设置保留
- [ ] 多轮递进生成

---

## 八、迁移注意事项

1. **Vue → React 状态管理**：`ref()` / `reactive()` 替换为 `useState()` / `useReducer()`，设置项可考虑 `useContext` 全局共享
2. **思维导图库兼容性**：当前使用 `simple-mind-map`，需确认 React 中的集成方式，或评估替代方案（如 `react-flow` + 自定义渲染）
3. **Ant Design Vue → Ant Design React**：组件 API 基本一致，但需注意 `v-model` → `value + onChange` 的转换
4. **文件上传**：Vue 版本使用 `beforeUpload` 拦截，React 中使用 Ant Design 的 `beforeUpload` 属性即可
5. **`h()` 函数**：Vue 中用于渲染图标，React 中直接使用 JSX 即可
6. **`nextSystemPrompt` 机制**：这是核心递进生成能力，迁移时务必保证节点数据的 `nextSystemPrompt` 字段在生成和读取时完整传递
7. **`INSERT_MULTI_CHILD_NODE` 命令**：需确认目标思维导图库是否支持批量插入子节点的 API
