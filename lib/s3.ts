
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getBucketConfig, createS3Client } from './aws-config'
import fs from 'fs'
import path from 'path'

const isAwsConfigured = (): boolean => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
  )
}

export const uploadFile = async (buffer: Buffer, fileName: string, category: string = 'uploads') => {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${category}/${Date.now()}-${cleanFileName}`

  if (isAwsConfigured()) {
    try {
      const { bucketName, folderPrefix } = getBucketConfig()
      const s3Client = createS3Client()
      const s3Key = `${folderPrefix}${key}`

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: getContentType(fileName)
      })

      await s3Client.send(command)
      return s3Key
    } catch (error) {
      console.warn('Error al subir a AWS S3, cambiando a almacenamiento local:', error)
    }
  }

  // Almacenamiento local en disco
  const filePath = path.join(process.cwd(), 'uploads', key)
  const dirPath = path.dirname(filePath)

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  await fs.promises.writeFile(filePath, buffer)
  return key
}

export const downloadFile = async (key: string) => {
  if (isAwsConfigured()) {
    try {
      const { bucketName } = getBucketConfig()
      const s3Client = createS3Client()

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      return signedUrl
    } catch (error) {
      console.warn('Error al obtener URL de S3:', error)
    }
  }

  return key
}

export const deleteFile = async (key: string) => {
  if (!key) return

  // Eliminar archivo local si existe
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', key),
      path.join(process.cwd(), 'uploads', path.basename(key))
    ]
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p)
      }
    }
  } catch (err) {
    console.warn('Error al eliminar archivo local:', err)
  }

  if (isAwsConfigured()) {
    try {
      const { bucketName } = getBucketConfig()
      const s3Client = createS3Client()

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      await s3Client.send(command)
    } catch (error) {
      console.warn('Error al eliminar archivo de S3:', error)
    }
  }
}

export const renameFile = async (oldKey: string, newKey: string) => {
  throw new Error('Rename operation not implemented')
}

const getContentType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'pdf':
      return 'application/pdf'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

