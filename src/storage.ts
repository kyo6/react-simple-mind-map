import type { MindMapDocument, AISettings } from './types'

const DB_NAME = 'simple-mind-map-demo'
const DB_VERSION = 2
const STORE_NAME = 'mindmaps'
const AI_SETTINGS_STORE = 'ai-settings'
const AI_SETTINGS_KEY = 'default'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!db.objectStoreNames.contains(AI_SETTINGS_STORE)) {
        db.createObjectStore(AI_SETTINGS_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const request = run(store)

        if (request) {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        } else {
          tx.oncomplete = () => resolve()
        }

        tx.onerror = () => reject(tx.error)
      }),
  )
}

export async function listMindMaps(): Promise<MindMapDocument[]> {
  const docs = (await transaction<MindMapDocument[]>(STORE_NAME, 'readonly', (store) =>
    store.getAll(),
  )) as MindMapDocument[]

  return docs.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveMindMap(doc: MindMapDocument): Promise<void> {
  await transaction(STORE_NAME, 'readwrite', (store) => {
    store.put(doc)
  })
}

export async function deleteMindMap(id: string): Promise<void> {
  await transaction(STORE_NAME, 'readwrite', (store) => {
    store.delete(id)
  })
}

export async function loadAISettings(): Promise<AISettings | null> {
  const result = await transaction<AISettings & { key: string }>(AI_SETTINGS_STORE, 'readonly', (store) =>
    store.get(AI_SETTINGS_KEY),
  )
  if (!result) return null
  const settings = { ...(result as AISettings & { key: string }) }
  delete (settings as Record<string, unknown>).key
  return settings
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await transaction(AI_SETTINGS_STORE, 'readwrite', (store) => {
    store.put({ key: AI_SETTINGS_KEY, ...settings })
  })
}
