const fs = require('fs');
const path = require('path');

let mdContent = fs.readFileSync('MANUAL_VISUAL.md', 'utf8');

let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Manual Visual - Cobranza Canary 1.2</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px; }
  h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 40px; }
  h2 { color: #2b6cb0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; }
  img { max-width: 100%; height: auto; border: 1px solid #cbd5e0; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  hr { border: 0; border-top: 1px solid #cbd5e0; margin: 40px 0; }
  li { margin-bottom: 15px; font-size: 16px; }
  p { font-size: 16px; }
  strong { color: #2d3748; }
</style>
</head>
<body>
`;

let lines = mdContent.split('\n');
lines.forEach(line => {
    if (line.startsWith('# ')) html += `<h1>${line.substring(2)}</h1>\n`;
    else if (line.startsWith('## ')) html += `<h2>${line.substring(3)}</h2>\n`;
    else if (line.startsWith('---')) html += `<hr/>\n`;
    else if (line.startsWith('- **')) {
        let text = line.substring(2);
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<li>${text}</li>\n`;
    }
    else if (line.startsWith('**')) html += `<p><strong>${line.replace(/\*\*/g, '')}</strong></p>\n`;
    else if (line.trim() === '') html += `\n`;
    else if (line.includes('![') && line.includes('](')) {
        let altRegex = /!\[(.*?)\]/;
        let alt = line.match(altRegex) ? line.match(altRegex)[1] : '';
        let pathRegex = /\((.*?)\)/;
        let imgPath = line.match(pathRegex) ? line.match(pathRegex)[1] : '';
        
        let fileName = imgPath.replace('<public/captura cobranzaCanary/', '').replace('>', '').replace('./public/captura%20cobranzaCanary/', '');
        if (fileName.includes('%20')) fileName = decodeURIComponent(fileName);
        
        try {
            const absolutePath = path.join(__dirname, 'public', 'captura cobranzaCanary', fileName);
            if (fs.existsSync(absolutePath)) {
                let imgData = fs.readFileSync(absolutePath, 'base64');
                html += `<img src="data:image/png;base64,${imgData}" alt="${alt}">\n`;
            } else {
                 html += `<p style="color:red">[Archivo no encontrado: "${fileName}" en ${absolutePath}]</p>\n`;
            }
        } catch(e) {
            html += `<p style="color:red">[Error: ${e.message}]</p>\n`;
        }
    }
    else {
        let text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<p>${text}</p>\n`;
    }
});

html += `</body></html>`;
fs.writeFileSync('MANUAL_LISTO_PARA_IMPRIMIR.html', html);
console.log('HTML CREADO CON EXITO');
