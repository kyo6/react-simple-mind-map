# AI 生成思维导图 — 项目上下文

## 项目概述

将 SimpleMind（Vue 3）中的 AI 生成思维导图功能迁移至当前 React 项目。

## 技术栈

- **框架**: React 19 + TypeScript + Vite
- **思维导图库**: simple-mind-map 0.14.0-fix.2 (UMD 加载)
- **UI 组件库**: antd (按需加载)
- **HTTP 客户端**: 原生 fetch
- **JSON 容错**: jsonrepair (已安装)
- **存储**: IndexedDB (思维导图文档 + AI 设置)
- **样式**: 纯 CSS + antd 组件
- **国际化**: 无 (UI 全中文)

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| UI 方案 | antd 按需加载 | 功能丰富，按需加载控制体积 |
| JS→TS 迁移 | 转为 TypeScript | 与项目其他模块一致 |
| AI 设置存储 | IndexedDB | 与思维导图文档存储统一 |
| 国际化 | 不做 | 当前项目无 i18n 基础，UI 全中文 |
| AI 入口位置 | 工具栏按钮 | 与现有"子节点/同级/删除"并列 |
| 设置面板形式 | 右侧抽屉 (Drawer) | 不遮挡思维导图 |
| 节点插入方式 | 数据层操作 + syncData | 与现有模式一致，不依赖库特定命令 |
| 文件解析 | 仅 .md/.txt | PDF 需额外依赖，后续再加 |
| 提示词扩写 | 包含 | 完整迁移 expandPrompt |

## 已有模块

| 模块 | 文件 | 状态 |
|------|------|------|
| AI 服务 | `src/libai.js` | 已存在，需转为 TS 并集成 |
| 常量配置 | `src/const.js` | 已存在，需转为 TS 并集成 |
| 类型定义 | `src/types.ts` | 已存在，需扩展 AI 相关类型 |
| 存储 | `src/storage.ts` | IndexedDB，需新增 AI 设置存储 |
| 画布组件 | `src/MindMapCanvas.tsx` | 已存在，需暴露 AI 节点插入接口 |
| 主应用 | `src/App.tsx` | 已存在，需集成 AI 功能入口 |

## 术语表

- **AI 生成**: 选中节点后调用 AI API 生成子节点的功能
- **递进生成**: 在 AI 生成的子节点上再次触发 AI 生成，利用 nextSystemPrompt 实现逐层深入
- **思维模型**: 预定义的思考框架（第一性原理、批判性思维等），影响 AI 生成方向
- **系统提示词**: 用户自定义的知识库文本，作为 Context 注入 Prompt
- **nextSystemPrompt**: 每个生成节点包含的字段，作为下一轮 AI 生成的"思考方向"
- **提示词扩写**: 调用 AI 优化和扩写用户填写的系统提示词
