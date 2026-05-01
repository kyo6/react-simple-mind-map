import { Drawer, Radio, Button, Typography } from 'antd'
import { thinkingModels } from './const'
import type { AISettings, ThinkingModel } from './types'

interface ThinkingModelDrawerProps {
  open: boolean
  settings: AISettings
  onSettingsChange: (settings: AISettings) => void
  onClose: () => void
  onLoadTemplate: (url: string) => void
}

export function ThinkingModelDrawer({
  open,
  settings,
  onSettingsChange,
  onClose,
  onLoadTemplate,
}: ThinkingModelDrawerProps) {
  const current = thinkingModels.find(m => m.value === settings.thinkingModel) || thinkingModels[0]

  const handleSelect = (value: string) => {
    onSettingsChange({ ...settings, thinkingModel: value })
  }

  return (
    <Drawer
      title="思维模型"
      placement="right"
      open={open}
      onClose={onClose}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Radio.Group
        value={settings.thinkingModel}
        onChange={(e) => handleSelect(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {thinkingModels.map((model: ThinkingModel) => (
          <div
            key={model.value}
            style={{
              padding: 12,
              border: `1px solid ${settings.thinkingModel === model.value ? '#2458c6' : '#dfe4ea'}`,
              borderRadius: 8,
              background: settings.thinkingModel === model.value ? '#f0f5ff' : '#fff',
            }}
          >
            <Radio value={model.value} style={{ fontWeight: 600 }}>
              {model.label}
            </Radio>
            <div style={{ marginLeft: 24, marginTop: 4 }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {model.description}
              </Typography.Text>
            </div>
            {settings.thinkingModel === model.value && model.prompt && (
              <div style={{ marginLeft: 24, marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#475569', whiteSpace: 'pre-wrap' }}>
                {model.prompt.trim()}
              </div>
            )}
            {settings.thinkingModel === model.value && model.example.length > 0 && (
              <div style={{ marginLeft: 24, marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {model.example.map((ex) => (
                  <Button
                    key={ex.name}
                    size="small"
                    type="dashed"
                    onClick={() => onLoadTemplate(ex.content)}
                  >
                    {ex.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </Radio.Group>

      {current && (
        <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>当前选择: {current.label}</Typography.Text>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
            {current.description}
          </div>
        </div>
      )}
    </Drawer>
  )
}
