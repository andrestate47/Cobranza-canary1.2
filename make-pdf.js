const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, 'public', 'captura cobranzaCanary');
const tempDir = path.join(__dirname, 'pdf_temp_images');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

let mdContent = fs.readFileSync('MANUAL_VISUAL.md', 'utf8');

const files = fs.readdirSync(sourceDir);
files.forEach(file => {
    const newName = file.replace(/\s+/g, '_');
    fs.copyFileSync(path.join(sourceDir, file), path.join(tempDir, newName));
    
    // Replace markdown tags that use the angle bracket syntax
    const regex1 = new RegExp(`<public/captura cobranzaCanary/${file.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}>`, 'g');
    // Replace URL encoded format if present
    const encodedFile = encodeURIComponent(file).replace(/[!'()*]/g, escape);
    const regex2 = new RegExp(`\\./public/captura%20cobranzaCanary/${encodedFile.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'g');
    
    mdContent = mdContent.replace(regex1, `./pdf_temp_images/${newName}`);
    mdContent = mdContent.replace(regex2, `./pdf_temp_images/${newName}`);
});

fs.writeFileSync('MANUAL_TEMP.md', mdContent);
console.log('Generando PDF...');

try {
    execSync('npx -y md-to-pdf MANUAL_TEMP.md', { stdio: 'inherit' });
    if (fs.existsSync('MANUAL_TEMP.pdf')) {
        // Enforce the new name
        if (fs.existsSync('MANUAL_VISUAL_COMPLETO.pdf')) fs.unlinkSync('MANUAL_VISUAL_COMPLETO.pdf');
        fs.renameSync('MANUAL_TEMP.pdf', 'MANUAL_VISUAL_COMPLETO.pdf');
    }
} catch (e) {
    console.error('Error generating PDF', e);
}

console.log('Limpiando archivos temporales...');
fs.rmSync(tempDir, { recursive: true, force: true });
if (fs.existsSync('MANUAL_TEMP.md')) fs.unlinkSync('MANUAL_TEMP.md');

console.log('¡Exito!');
