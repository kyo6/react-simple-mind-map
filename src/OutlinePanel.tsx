import { useState } from 'react'
import type { MindNode } from './types'

interface OutlinePanelProps {
  root: MindNode
  selectedUid: string | null
  onSelect: (uid: string) => void
  onRename: (uid: string, text: string) => void
  onAddChild: (uid: string) => void
  onAddSibling: (uid: string) => void
  onDelete: (uid: string) => void
  onToggle: (uid: string) => void
}

interface OutlineNodeProps extends Omit<OutlinePanelProps, 'root'> {
  node: MindNode
  level: number
  isRoot: boolean
}

function OutlineNode({
  node,
  level,
  isRoot,
  selectedUid,
  onSelect,
  onRename,
  onAddChild,
  onAddSibling,
  onDelete,
  onToggle,
}: OutlineNodeProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.data.text)
  const uid = node.data.uid || ''
  const children = node.children || []
  const expanded = node.data.expand !== false

  const commit = () => {
    const value = draft.trim()
    onRename(uid, value || '未命名节点')
    setEditing(false)
  }

  return (
    <li>
      <div
        className={`outline-node ${selectedUid === uid ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        <button
          type="button"
          className="icon-button ghost"
          disabled={children.length === 0}
          title={expanded ? '收起' : '展开'}
          onClick={() => onToggle(uid)}
        >
          {children.length > 0 ? (expanded ? '−' : '+') : ''}
        </button>

        {editing ? (
          <input
            className="outline-input"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit()
              if (event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <button
            type="button"
            className="outline-title"
            onClick={() => onSelect(uid)}
            onDoubleClick={() => {
              setDraft(node.data.text)
              setEditing(true)
            }}
          >
            {node.data.text}
          </button>
        )}

        <div className="outline-actions">
          <button
            type="button"
            className="icon-button"
            title="新增子节点"
            onClick={() => onAddChild(uid)}
          >
            子
          </button>
          <button
            type="button"
            className="icon-button"
            title="新增同级节点"
            disabled={isRoot}
            onClick={() => onAddSibling(uid)}
          >
            同
          </button>
          <button
            type="button"
            className="icon-button danger"
            title="删除节点"
            disabled={isRoot}
            onClick={() => onDelete(uid)}
          >
            删
          </button>
        </div>
      </div>

      {expanded && children.length > 0 ? (
        <ul>
          {children.map((child) => (
            <OutlineNode
              key={child.data.uid}
              node={child}
              level={level + 1}
              isRoot={false}
              selectedUid={selectedUid}
              onSelect={onSelect}
              onRename={onRename}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function OutlinePanel(props: OutlinePanelProps) {
  return (
    <aside className="outline-panel">
      <div className="panel-heading">
        <span>大纲</span>
        <small>双击编辑</small>
      </div>
      <ul className="outline-tree">
        <OutlineNode {...props} node={props.root} level={0} isRoot />
      </ul>
    </aside>
  )
}
