import admin from 'firebase-admin'

function getBucket() {
  return admin.storage().bucket(process.env.GCS_BUCKET_NAME ?? `${process.env.FIREBASE_PROJECT_ID}.appspot.com`)
}

export async function uploadFile(
  objectPath: string,
  content: string,
  contentType = 'text/plain',
): Promise<void> {
  const file = getBucket().file(objectPath)
  await file.save(content, {
    contentType,
  })
}

export async function downloadFile(objectPath: string): Promise<string> {
  const file = getBucket().file(objectPath)
  const [contents] = await file.download()
  return contents.toString('utf-8')
}
