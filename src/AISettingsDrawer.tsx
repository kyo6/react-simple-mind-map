import { useState } from 'react'
import { Drawer, Tabs, Input, Select, Slider, Button, Upload, message } from 'antd'
import { UploadOutlined, ExpandOutlined, ApiOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import type { AISettings } from './types'
import { thinkingModels, languageOptions, modelOptions } from './const'
import { expandPrompt, checkModelConfig } from './libai'
import { saveAISettings } from './storage'

interface AISettingsDrawerProps {
  open: boolean
  settings: AISettings
  onSettingsChange: (settings: AISettings) => void
  onClose: () => void
}

export function AISettingsDrawer({
  open,
  settings,
  onSettingsChange,
  onClose,
}: AISettingsDrawerProps) {
  const [local, setLocal] = useState<AISettings>(settings)
  const [expanding, setExpanding] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [checkError, setCheckError] = useState('')

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    const next = { ...local, [key]: value }
    setLocal(next)
    onSettingsChange(next)
    saveAISettings(next)
    if (key === 'api' || key === 'secret' || key === 'model') {
      setCheckStatus('idle')
      setCheckError('')
    }
  }

  const handleExpandPrompt = async () => {
    if (!local.systemPrompt.trim()) {
      message.warning('请先输入系统提示词')
      return
    }
    if (!local.api.trim() || !local.secret.trim()) {
      message.warning('请先配置 API 地址和密钥')
      return
    }

    setExpanding(true)
    try {
      const expanded = await expandPrompt({
        currentPrompt: local.systemPrompt,
        api: local.api,
        secret: local.secret,
        model: local.model,
        language: local.language,
      })
      if (expanded) {
        const next = { ...local, systemPrompt: expanded }
        setLocal(next)
        onSettingsChange(next)
        saveAISettings(next)
        message.success('提示词扩写完成')
      }
    } catch {
      message.error('提示词扩写失败，请检查 API 配置')
    } finally {
      setExpanding(false)
    }
  }

  const handleCheckConfig = async () => {
    if (!local.api.trim()) {
      setCheckStatus('error')
      setCheckError('请先填写 API 地址')
      return
    }
    if (!local.secret.trim()) {
      setCheckStatus('error')
      setCheckError('请先填写密钥')
      return
    }
    if (!local.model.trim()) {
      setCheckStatus('error')
      setCheckError('请先选择模型')
      return
    }

    setChecking(true)
    setCheckStatus('idle')
    setCheckError('')
    try {
      const result = await checkModelConfig({
        api: local.api,
        secret: local.secret,
        model: local.model,
      })
      if (result.success) {
        setCheckStatus('success')
      } else {
        setCheckStatus('error')
        setCheckError(result.error || '配置验证失败')
      }
    } catch {
      setCheckStatus('error')
      setCheckError('配置验证失败，请检查网络连接')
    } finally {
      setChecking(false)
    }
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        const next = { ...local, systemPrompt: text }
        setLocal(next)
        onSettingsChange(next)
        saveAISettings(next)
        message.success(`已加载文件: ${file.name}`)
      }
    }
    reader.readAsText(file)
    return false
  }

  return (
    <Drawer
      title="AI 设置"
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: '基础设置',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>API 地址</label>
                  <Input
                    placeholder="https://api.openai.com/v1"
                    value={local.api}
                    onChange={(e) => update('api', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>密钥</label>
                  <Input.Password
                    placeholder="sk-..."
                    value={local.secret}
                    onChange={(e) => update('secret', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>模型</label>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="选择模型"
                    value={local.model || undefined}
                    onChange={(v) => update('model', v)}
                    options={modelOptions}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ||
                      (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </div>
                <div>
                  <Button
                    icon={<ApiOutlined />}
                    loading={checking}
                    onClick={handleCheckConfig}
                    size="small"
                  >
                    检查配置
                  </Button>
                  {checkStatus === 'success' && (
                    <div style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      color: '#52c41a',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <CheckCircleFilled />
                      配置验证成功
                    </div>
                  )}
                  {checkStatus === 'error' && (
                    <div style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#fff2f0',
                      border: '1px solid #ffccc7',
                      color: '#ff4d4f',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <CloseCircleFilled />
                      {checkError}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
                    生成节点数: {local.depth}
                  </label>
                  <Slider
                    min={1}
                    max={20}
                    value={local.depth}
                    onChange={(v) => update('depth', v)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
                    温度: {local.temperature.toFixed(1)}
                  </label>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={local.temperature}
                    onChange={(v) => update('temperature', v)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>语言</label>
                  <Select
                    style={{ width: '100%' }}
                    value={local.language}
                    onChange={(v) => update('language', v)}
                    options={languageOptions}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>思维模型</label>
                  <Select
                    style={{ width: '100%' }}
                    value={local.thinkingModel}
                    onChange={(v) => update('thinkingModel', v)}
                    options={thinkingModels.map(m => ({ label: m.label, value: m.value }))}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'knowledge',
            label: '知识库',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>系统提示词</label>
                  <Input.TextArea
                    rows={10}
                    placeholder="输入知识库内容或系统提示词..."
                    value={local.systemPrompt}
                    onChange={(e) => update('systemPrompt', e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Upload
                    accept=".md,.txt"
                    showUploadList={false}
                    beforeUpload={handleFileUpload}
                  >
                    <Button icon={<UploadOutlined />}>上传文件</Button>
                  </Upload>
                  <Button
                    icon={<ExpandOutlined />}
                    loading={expanding}
                    onClick={handleExpandPrompt}
                  >
                    AI 扩写
                  </Button>
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  支持 .md / .txt 文件，内容将作为知识库上下文注入 AI 提示词
                </div>
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  )
}
