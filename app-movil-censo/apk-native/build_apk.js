const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== COMPILANDO APK CORREGIDO (GPS NATIVO + MAPA RESILIENTE) ===');

const projectDir = 'C:\\Users\\USER03\\.gemini\\antigravity\\scratch\\Aseo-Censo-APK';
const javaHome = 'C:\\Users\\USER03\\.gemini\\antigravity\\scratch\\transito-villa-rosario\\android-app\\jdk-17.0.12+7';
const androidSdk = 'C:\\Users\\USER03\\AppData\\Local\\Android\\Sdk';
const buildTools = path.join(androidSdk, 'build-tools', '36.0.0');
const androidJar = path.join(androidSdk, 'platforms', 'android-37.0', 'android.jar');

const aapt2 = path.join(buildTools, 'aapt2.exe');
const zipalign = path.join(buildTools, 'zipalign.exe');
const d8Jar = path.join(buildTools, 'lib', 'd8.jar');
const apksignerJar = path.join(buildTools, 'lib', 'apksigner.jar');

const javac = path.join(javaHome, 'bin', 'javac.exe');
const java = path.join(javaHome, 'bin', 'java.exe');
const jar = path.join(javaHome, 'bin', 'jar.exe');
const keystore = 'C:\\Users\\USER03\\.gemini\\antigravity\\scratch\\transito-villa-rosario\\android-app\\debug.keystore';

const binDir = path.join(projectDir, 'bin');
const srcDir = path.join(projectDir, 'src', 'com', 'alcaldia', 'aseourbano', 'censo');

function run(cmd) {
  console.log(`> ${cmd.substring(0, 85)}...`);
  const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (out.length) {
    const s = out.toString().trim();
    if (s) console.log(s);
  }
}

process.chdir(projectDir);

// 1. Limpieza
if (fs.existsSync(binDir)) fs.rmSync(binDir, { recursive: true, force: true });
fs.mkdirSync(binDir, { recursive: true });
['compiled_res.zip', 'unaligned.apk', 'aligned.apk', 'classes.dex', 'app.jar', 'censo-aseo-alcaldia.apk'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

// 2. aapt2 compile
console.log('1. Compilando recursos XML...');
run(`"${aapt2}" compile --dir res -o compiled_res.zip`);

// 3. aapt2 link con assets locales (leaflet)
console.log('2. Enlazando paquete APK y empaquetando assets locales...');
run(`"${aapt2}" link -I "${androidJar}" --manifest AndroidManifest.xml -A assets -o unaligned.apk compiled_res.zip --java src --auto-add-overlay`);

// 4. Compilar Java
console.log('3. Compilando clases Java con OpenJDK...');
const javaFiles = [
  path.join(srcDir, 'MainActivity.java'),
  path.join(srcDir, 'R.java')
];
run(`"${javac}" --release 17 -encoding UTF-8 -cp "${androidJar}" -d bin "${javaFiles[0]}" "${javaFiles[1]}"`);

// 5. Empaquetar app.jar y convertir con D8
console.log('4. Empaquetando bytecode DEX...');
run(`"${jar}" cvf app.jar -C bin .`);
run(`"${java}" -cp "${d8Jar}" com.android.tools.r8.D8 --output . --min-api 24 app.jar`);

// 6. Agregar classes.dex a unaligned.apk
console.log('5. Insertando classes.dex al APK...');
run(`"${jar}" uf unaligned.apk classes.dex`);

// 7. Zipalign a 4 bytes
console.log('6. Alineando APK con zipalign...');
run(`"${zipalign}" -f -p 4 unaligned.apk aligned.apk`);

// 8. Firmar con apksigner
console.log('7. Firmando APK con apksigner...');
const finalApk = path.join(projectDir, 'censo-aseo-alcaldia.apk');
run(`"${java}" -jar "${apksignerJar}" sign --ks "${keystore}" --ks-pass pass:android --key-pass pass:android --out "${finalApk}" aligned.apk`);

// 9. Verificar firma
console.log('8. Verificando APK generado...');
run(`"${java}" -jar "${apksignerJar}" verify "${finalApk}"`);

// 10. Copiar a destinos
const destinations = [
  'C:\\Users\\USER03\\Downloads\\censo-aseo-alcaldia.apk',
  'C:\\Users\\USER03\\Downloads\\Censo-Alcaldia.apk',
  'C:\\Users\\USER03\\.gemini\\antigravity\\scratch\\Aseo-Censo-Flutter\\preview\\censo-aseo-alcaldia.apk',
  'C:\\Users\\USER03\\.gemini\\antigravity\\scratch\\Aseo-Urbano-git\\releases\\censo-aseo-alcaldia.apk',
  'C:\\Users\\USER03\\.gemini\\antigravity\\brain\\b809071e-f0c5-48d7-9ce9-a8f3fa3881ba\\censo-aseo-alcaldia.apk'
];

for (const dest of destinations) {
  try {
    fs.copyFileSync(finalApk, dest);
    console.log(`✓ Copiado a: ${dest}`);
  } catch (e) {
    console.error(`Error copiando a ${dest}:`, e.message);
  }
}

const stat = fs.statSync(finalApk);
console.log('\\n========================================');
console.log('¡APK REPARADO Y COMPILADO EXITOSAMENTE!');
console.log(`Tamaño final: ${(stat.size / 1024).toFixed(1)} KB`);
console.log('Ubicación: C:\\Users\\USER03\\Downloads\\censo-aseo-alcaldia.apk');
console.log('========================================\\n');
