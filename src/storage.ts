import type { MindMapDocument } from './types'

const DB_NAME = 'simple-mind-map-demo'
const DB_VERSION = 1
const STORE_NAME = 'mindmaps'

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
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
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
  const docs = (await transaction<MindMapDocument[]>('readonly', (store) =>
    store.getAll(),
  )) as MindMapDocument[]

  return docs.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveMindMap(doc: MindMapDocument): Promise<void> {
  await transaction('readwrite', (store) => {
    store.put(doc)
  })
}

export async function deleteMindMap(id: string): Promise<void> {
  await transaction('readwrite', (store) => {
    store.delete(id)
  })
}
