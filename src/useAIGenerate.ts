import { useState, useCallback } from 'react'
import { buildPrompt, requestCompletions, extractIdeas } from './libai'
import { addAIChildNodes, getNodeText, getNodeSystemPrompt } from './mindmapData'
import type { AISettings, AIGenerateNode, MindNode } from './types'

interface UseAIGenerateOptions {
  settings: AISettings
  currentRoot: MindNode
  selectedUid: string | null
  onRootChange: (root: MindNode) => void
}

export function useAIGenerate({
  settings,
  currentRoot,
  selectedUid,
  onRootChange,
}: UseAIGenerateOptions) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async () => {
    if (!selectedUid) {
      throw new Error('请先选中一个节点')
    }
    if (!settings.api?.trim()) {
      throw new Error('请先配置 API 地址')
    }
    if (!settings.secret?.trim()) {
      throw new Error('请先配置 API 密钥')
    }

    const topic = getNodeText(currentRoot, selectedUid)
    if (!topic.trim()) {
      throw new Error('选中节点文本为空')
    }

    const nextSystemPrompt = getNodeSystemPrompt(currentRoot, selectedUid)

    setIsGenerating(true)
    try {
      const prompt = buildPrompt(
        topic,
        settings.depth,
        nextSystemPrompt,
        settings.systemPrompt,
        settings,
      )

      const { data } = await requestCompletions({
        api: settings.api,
        secret: settings.secret,
        model: settings.model,
        temperature: settings.temperature,
        prompt,
      })

      const ideas: AIGenerateNode[] = extractIdeas(data)

      if (!Array.isArray(ideas) || ideas.length === 0) {
        throw new Error('AI 未返回有效的思维导图数据')
      }

      const newRoot = addAIChildNodes(currentRoot, selectedUid, ideas)
      onRootChange(newRoot)
    } finally {
      setIsGenerating(false)
    }
  }, [settings, currentRoot, selectedUid, onRootChange])

  return { isGenerating, generate }
}
