import { thinkingModels } from './const'
import { jsonrepair } from 'jsonrepair'
import type { AISettings, AIGenerateNode } from './types'

export function buildPrompt(
    topic: string,
    count: number,
    nextSystemPrompt: string,
    systemPrompt: string,
    settings: Partial<AISettings> = {},
): string {
    const thinkingModel = settings.thinkingModel || 'default'
    const model = thinkingModels.find(m => m.value === thinkingModel) || thinkingModels[0]
    const language = settings.language || '中文'

    let effectiveNextPrompt = nextSystemPrompt
    if (!effectiveNextPrompt || effectiveNextPrompt.trim().length === 0) {
        effectiveNextPrompt = "Most relevant key points"
    }

    let contextBlock = ''
    if (systemPrompt && systemPrompt.trim().length > 0) {
        contextBlock = "## Context & Data\n<context>\n" + systemPrompt + "\n</context>\n\n"
    }

    let thinkingPrompt = ""
    if (model.prompt && model.prompt.trim() !== '') {
        const label = model.label || 'Any'
        thinkingPrompt = `## Thinking Model 
<context>
Use ${label} thinking model, ${model.description || ''}
Reference principles: ${model.prompt}
</context>`
    }

    return `${contextBlock}## Role Definition   
You are an expert in organizing mind maps, proficient in knowledge related to "${topic}".

${thinkingPrompt}

## Output Examples
<examples>
\`\`\`json
[
    {
        "data": {
            "text": "Relevant Key Point 1",
            "note": "Description of the key point",
            "nextSystemPrompt": "Prompt for child key points",
            "color": "Key point color in Hex code"
        },
        "children": [
            {   
                "data": {},
                "children": []
            }
        ]
    }
]
\`\`\`
</examples>
 
## Rules
Please strictly follow these rules:
<rules>
- Output in JSON array format
- Output Language: ${language}
- Generate a 2-layer mind map structure by default, including the first level array and \`children\` arrays.
- The first level JSON array must have at least ${count} elements and at most ${count * 2} elements.
- The \`children\` array of each array element must have at least ${count} elements and at most ${count * 2} elements.
- Thinking Direction: ${effectiveNextPrompt}
- JSON field \`children\` is an array of child key points. Each element is a child key point, which is a JSON object containing \`data\` and \`children\` fields.
- JSON field \`text\` is a "Brief Description", limited to 20-50 words, and must not be empty.
- JSON field \`note\` is a "Detailed Description", limited to 40-200 words, and must not be empty.
- JSON field \`nextSystemPrompt\` is "Keywords summarizing the current level and AI prompt for the next level child key points", limited to 30-60 words. Example: Based on xxx key point, summarize xxx child key points.
- JSON field \`color\` marks the key point color based on "Color Psychology" principles, using Hex color code. Avoid light colors; each RGB value should be less than 200. Example: \`#8B0A50\`.
</rules>

## Task
Now, based on "${topic}", output the mind map following the structure in "Output Examples".    
`
}

export function extractIdeas(raw: unknown): AIGenerateNode[] {
    const rawObj = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : null

    let content = ''
    if (rawObj?.choices) {
        const choices = rawObj.choices as Array<{ message: { content: string } }>
        content = choices[0]?.message?.content || ''
    } else if (rawObj?.output_text) {
        content = String(rawObj.output_text)
    } else if (rawObj?.text) {
        content = String(rawObj.text)
    } else if (typeof raw === 'string') {
        content = raw
    }

    const cleaned = String(content)
        .replace(/^\s*```json(?:\s*|\r?\n)/i, '')
        .replace(/```[\s\n]*$/i, '')
        .trim()

    let parsed: unknown
    try {
        parsed = JSON.parse(cleaned)
    } catch {
        try {
            const repaired = jsonrepair(cleaned)
            parsed = JSON.parse(repaired)
        } catch {
            throw new Error('返回内容不是有效 JSON，且无法自动修复')
        }
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>
        if (obj.children || obj.data) {
            return (obj.children || obj.data) as AIGenerateNode[]
        }
    }

    return parsed as AIGenerateNode[]
}

export function resolveEndpoint(api: string): string {
    return (api || '').trim() + '/chat/completions'
}

function normalizeSecret(secret: string): string {
    if (!secret) return ''
    const s = String(secret).trim()
    if (s.startsWith('my-')) {
        const encoded = s.slice(3).replace(/\s+/g, '')
        const urlsafe = encoded.replace(/-/g, '+').replace(/_/g, '/')
        const padded = urlsafe + '='.repeat((4 - (urlsafe.length % 4)) % 4)
        try {
            return atob(padded)
        } catch {
            return s
        }
    }

    return s
}

interface CompletionsParams {
    api: string
    secret: string
    model?: string
    temperature?: number
    prompt: string
}

interface CompletionsResult {
    data: unknown
    isJson: boolean
    endpoint: string
}

export async function requestCompletions({
    api,
    secret,
    model = 'gpt-4o',
    temperature = 0.7,
    prompt,
}: CompletionsParams): Promise<CompletionsResult> {
    const endpoint = resolveEndpoint(api)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authSecret = normalizeSecret(secret)
    if (authSecret) headers.Authorization = `Bearer ${authSecret}`

    const body = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: 32000,
        enable_thinking: false,
    }

    const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    const data = isJson ? await res.json() : await res.text()
    return { data, isJson, endpoint }
}

interface CheckModelConfigParams {
    api: string
    secret: string
    model: string
}

interface CheckModelConfigResult {
    success: boolean
    error?: string
}

export async function checkModelConfig({
    api,
    secret,
    model,
}: CheckModelConfigParams): Promise<CheckModelConfigResult> {
    const endpoint = resolveEndpoint(api)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const authSecret = normalizeSecret(secret)
    if (authSecret) headers.Authorization = `Bearer ${authSecret}`

    const body = {
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0,
        max_tokens: 1,
        enable_thinking: false,
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
            return { success: true }
        }

        if (res.status === 401 || res.status === 403) {
            return { success: false, error: '密钥无效或无权限访问' }
        }
        if (res.status === 404) {
            return { success: false, error: 'API 地址无效或模型不存在' }
        }
        if (res.status === 429) {
            return { success: false, error: '请求过于频繁，请稍后重试' }
        }
        if (res.status >= 500) {
            return { success: false, error: '服务器内部错误，请稍后重试' }
        }

        let errorMsg = '配置验证失败'
        try {
            const errData = await res.json()
            const msg = errData?.error?.message || errData?.message || errData?.msg
            if (typeof msg === 'string' && msg.trim()) {
                errorMsg = msg.trim()
            }
        } catch {
            // ignore json parse errors in error response
        }

        return { success: false, error: errorMsg }
    } catch (err) {
        if (err instanceof DOMException && err.name === 'TimeoutError') {
            return { success: false, error: '请求超时，请检查 API 地址是否正确' }
        }
        return { success: false, error: 'API 地址无法访问' }
    }
}

interface ExpandPromptParams {
    currentPrompt: string
    api: string
    secret: string
    model: string
    language?: string
}

export async function expandPrompt({
    currentPrompt,
    api,
    secret,
    model,
    language = '中文',
}: ExpandPromptParams): Promise<string> {
    const prompt = `
## Role Definition   
You are an encyclopedic knowledge expert. Based on "${currentPrompt}", please optimize and expand the detailed content.

## Task
- Optimize and expand the detailed content, ensuring it is rich, structured, and meets the requirements for generating a mind map.
- Output Language: ${language} 
`

    const { data } = await requestCompletions({
        api,
        secret,
        model,
        prompt,
    })

    if (typeof data === 'string') {
        return data.trim()
    }

    const d = data as Record<string, unknown>
    const content = (d?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content
        || String(d?.output_text || '')
        || String(d?.text || '')

    return content.trim()
}
