const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Generate Citizen SVG Icon (Sky Blue)
const svgCitizen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bg)" />
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#38bdf8" stroke-width="4" stroke-opacity="0.3" />
  <g filter="url(#shadow)" transform="translate(256, 210) scale(1.1)">
    <path d="M-90,20 L-90,-50 C-90,-75 90,-75 90,-50 L90,20 C90,85 0,120 0,120 C0,120 -90,85 -90,20 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="6" />
    <g transform="translate(0, 5) scale(1.4)">
      <rect x="-42" y="-35" width="52" height="38" rx="4" fill="#38bdf8" />
      <path d="M12,-15 L28,-15 L38,2 L38,3 L12,3 Z" fill="#0284c7" />
      <rect x="15" y="-12" width="12" height="10" rx="2" fill="#e0f2fe" />
      <rect x="-44" y="3" width="84" height="7" rx="3" fill="#64748b" />
      <circle cx="-25" cy="12" r="9" fill="#0f172a" stroke="#94a3b8" stroke-width="3" />
      <circle cx="-25" cy="12" r="3" fill="#38bdf8" />
      <circle cx="24" cy="12" r="9" fill="#0f172a" stroke="#94a3b8" stroke-width="3" />
      <circle cx="24" cy="12" r="3" fill="#38bdf8" />
      <path d="M-16,-24 L-12,-14 L-20,-18 Z" fill="#ffffff" />
      <path d="M-10,-10 L-20,-10 L-15,-16 Z" fill="#ffffff" />
    </g>
  </g>
  <text x="256" y="395" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="2">ASEO URBANO</text>
  <text x="256" y="432" text-anchor="middle" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" letter-spacing="1">ROSARIO DE PERIJÁ</text>
  <text x="256" y="462" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" letter-spacing="3">APP CIUDADANA</text>
</svg>`;

// 2. Generate Cuadrilla SVG Icon (Amber / Gold)
const svgCuadrilla = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706" />
      <stop offset="50%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <filter id="shadowc" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bgc)" />
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#fbbf24" stroke-width="4" stroke-opacity="0.3" />
  <g filter="url(#shadowc)" transform="translate(256, 210) scale(1.1)">
    <path d="M-90,20 L-90,-50 C-90,-75 90,-75 90,-50 L90,20 C90,85 0,120 0,120 C0,120 -90,85 -90,20 Z" fill="#020617" stroke="#fbbf24" stroke-width="6" />
    <g transform="translate(0, 5) scale(1.4)">
      <rect x="-42" y="-35" width="52" height="38" rx="4" fill="#fbbf24" />
      <path d="M12,-15 L28,-15 L38,2 L38,3 L12,3 Z" fill="#d97706" />
      <rect x="15" y="-12" width="12" height="10" rx="2" fill="#fef3c7" />
      <rect x="-44" y="3" width="84" height="7" rx="3" fill="#94a3b8" />
      <circle cx="-25" cy="12" r="9" fill="#020617" stroke="#f59e0b" stroke-width="3" />
      <circle cx="-25" cy="12" r="3" fill="#fbbf24" />
      <circle cx="24" cy="12" r="9" fill="#020617" stroke="#f59e0b" stroke-width="3" />
      <circle cx="24" cy="12" r="3" fill="#fbbf24" />
    </g>
  </g>
  <text x="256" y="395" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="2">APP CUADRILLA</text>
  <text x="256" y="432" text-anchor="middle" fill="#fbbf24" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" letter-spacing="1">ROSARIO DE PERIJÁ</text>
  <text x="256" y="462" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" letter-spacing="3">OPERATIVA DE CAMPO</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgCitizen, 'utf8');
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-icon.svg'), svgCuadrilla, 'utf8');

// Helper to create PNGs
function createPng(size, r, g, b) {
  const width = size;
  const height = size;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  
  const cornerRadius = size * 0.22;
  const center = size / 2;
  
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++);
    for (let x = 0; x < width; x++) {
      let inside = true;
      let alpha = 255;
      const dx = Math.abs(x - center) - (center - cornerRadius);
      const dy = Math.abs(y - center) - (center - cornerRadius);
      
      if (dx > 0 && dy > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerRadius) inside = false;
        else if (dist > cornerRadius - 1) alpha = Math.floor(255 * (cornerRadius - dist));
      }
      
      if (!inside) {
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
        rawData.writeUInt8(0, offset++);
      } else {
        const factor = y / height;
        const curR = Math.floor(r * (1 - factor * 0.6));
        const curG = Math.floor(g * (1 - factor * 0.5));
        const curB = Math.floor(b * (1 - factor * 0.2) + 20 * factor);
        
        const distCenter = Math.sqrt((x - center) * (x - center) + (y - center * 0.8) * (y - center * 0.8));
        let finalR = curR;
        let finalG = curG;
        let finalB = curB;
        
        if (distCenter < size * 0.28) {
          finalR = Math.floor(finalR * 0.2 + 15 * 0.8);
          finalG = Math.floor(finalG * 0.2 + 23 * 0.8);
          finalB = Math.floor(finalB * 0.2 + 42 * 0.8);
        }
        
        rawData.writeUInt8(finalR, offset++);
        rawData.writeUInt8(finalG, offset++);
        rawData.writeUInt8(finalB, offset++);
        rawData.writeUInt8(alpha, offset++);
      }
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  table[i] = c;
}

// Ciudadano PNGs (Sky blue: 2, 132, 199)
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 2, 132, 199));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 2, 132, 199));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createPng(192, 2, 132, 199));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPng(512, 2, 132, 199));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 2, 132, 199));
fs.writeFileSync(path.join(iconsDir, 'favicon-48x48.png'), createPng(48, 2, 132, 199));

// Cuadrilla PNGs (Amber/Gold: 217, 119, 6)
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-192x192.png'), createPng(192, 217, 119, 6));
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-512x512.png'), createPng(512, 217, 119, 6));
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-maskable-192.png'), createPng(192, 217, 119, 6));
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-maskable-512.png'), createPng(512, 217, 119, 6));
fs.writeFileSync(path.join(iconsDir, 'cuadrilla-apple-touch-icon.png'), createPng(180, 217, 119, 6));

console.log('✅ Generated all Citizen and Cuadrilla PWA icons successfully!');
