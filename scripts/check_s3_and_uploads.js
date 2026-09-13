const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');

async function main() {
  console.log('=== 1. VERIFICANDO ARCHIVOS SUBIDOS EN AMAZON S3 ===');
  const bucketName = process.env.AWS_BUCKET_NAME || 'abacusai-apps-0514bebbf2de9940617902d9-us-west-2';
  const region = process.env.AWS_REGION || 'us-west-2';
  const prefix = process.env.AWS_FOLDER_PREFIX || '2054/';

  try {
    const s3 = new S3Client({ region });
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix
    });

    const data = await s3.send(command);
    if (data.Contents && data.Contents.length > 0) {
      console.log(`✅ Se encontraron ${data.Contents.length} archivos en Amazon S3!`);
      data.Contents.forEach((item, index) => {
        console.log(`${index + 1}. Key: ${item.Key} (${(item.Size / 1024).toFixed(1)} KB, Fecha: ${item.LastModified.toISOString().split('T')[0]})`);
      });
    } else {
      console.log('⚪ No se encontraron archivos subidos en la carpeta S3.');
    }
  } catch (err) {
    console.log('Error al consultar S3:', err.message);
  }

  console.log('\n=== 2. VERIFICANDO CARPETAS DE UPLOADS LOCALES ===');
  const localUploadPaths = [
    '/var/www/cobranza/public/uploads',
    '/var/www/cobranza/uploads',
    'd:\\proyectos\\Cobranza-canary1.2\\public\\uploads',
    'd:\\proyectos\\Cobranza-canary1.2\\uploads'
  ];

  for (const uPath of localUploadPaths) {
    if (fs.existsSync(uPath)) {
      console.log(`Carpeta existente: ${uPath}`);
      try {
        const files = fs.readdirSync(uPath);
        console.log(`Archivos (${files.length}):`, files);
      } catch (e) {}
    }
  }
}

main();
