import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'reportes' o 'pagos'

    if (!file) {
      return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre de archivo único
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    
    const validTypes = ['reportes', 'pagos', 'resoluciones'];
    const uploadDir = validTypes.includes(type || '') ? type : 'reportes';
    
    // Guardar en public/uploads/...
    const filepath = path.join(process.cwd(), 'public', 'uploads', uploadDir as string, filename);
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${uploadDir}/${filename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
