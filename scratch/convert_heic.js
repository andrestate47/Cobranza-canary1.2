const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const heicConvert = require('heic-convert');

const inputDir = 'd:\\proyectos\\El-Caserito\\public\\images\\platos';
const outputDir = inputDir;

async function convertHeicToJpeg() {
  const files = fs.readdirSync(inputDir);
  const heicFiles = files.filter(f => f.toLowerCase().endsWith('.heic'));
  
  if (heicFiles.length === 0) {
    console.log("No HEIC files found!");
    return;
  }
  
  console.log(`Found ${heicFiles.length} HEIC files to convert.`);
  
  for (const file of heicFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace(/\.heic$/i, '.jpg'));
    
    console.log(`Converting ${file} to JPG...`);
    try {
      const inputBuffer = fs.readFileSync(inputPath);
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.8
      });
      fs.writeFileSync(outputPath, outputBuffer);
      console.log(`Successfully converted ${file}`);
      
      // Optionally delete the original HEIC
      fs.unlinkSync(inputPath);
    } catch (e) {
      console.error(`Failed to convert ${file}:`, e);
    }
  }
  
  console.log("Conversion complete!");
}

convertHeicToJpeg();
