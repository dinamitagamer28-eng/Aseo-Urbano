const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5050;
const HTML_FILE = path.join(__dirname, 'index.html');
const APK_FILE = path.join(__dirname, 'censo-aseo-alcaldia.apk');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/censo-aseo-alcaldia.apk' || url.endsWith('.apk')) {
    if (fs.existsSync(APK_FILE)) {
      const stat = fs.statSync(APK_FILE);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="censo-aseo-alcaldia.apk"',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(APK_FILE).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo APK no encontrado.');
      return;
    }
  }

  fs.readFile(HTML_FILE, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error cargando simulador');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor y Descarga APK activo en puerto 5050');
});
