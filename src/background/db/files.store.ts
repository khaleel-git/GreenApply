import { getDB } from './idb'

export interface StoredFile {
  id: string
  fileName: string
  fileType: string
  dataBase64: string
  uploadedAt: number
}

export async function saveFile(id: string, fileName: string, fileType: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await getDB()
  // convert to base64 to simplify export/import JSON
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
  }
  const dataBase64 = btoa(binary)
  await db.put('files', { id, fileName, fileType, dataBase64, uploadedAt: Date.now() })
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  const db = await getDB()
  return db.get('files', id)
}

export async function getAllFiles(): Promise<StoredFile[]> {
  const db = await getDB()
  return db.getAll('files')
}

export async function clearFiles(): Promise<void> {
  const db = await getDB()
  await db.clear('files')
}
