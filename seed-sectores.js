const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = [
  // LUNES
  { nombre: "Casco Central", dias: "LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO" },
  { nombre: "Alcaldía Rosario de Perijá", dias: "LUNES" },
  { nombre: "SETRIB", dias: "LUNES" },
  { nombre: "Intendencia Municipal", dias: "LUNES" },
  { nombre: "Instituto Municipal de Atencion al Ciudadano", dias: "LUNES" },
  { nombre: "Urb. Las Colinas", dias: "LUNES" },
  { nombre: "Los Chaguaramos", dias: "LUNES" },
  { nombre: "Los Chaguaramos CECAT", dias: "LUNES" },
  { nombre: "Calle El Márquez", dias: "LUNES" },
  { nombre: "Sector El Recreo", dias: "LUNES" },
  { nombre: "Sector El Valle", dias: "LUNES" },
  { nombre: "Sector Maria Alejandra", dias: "LUNES" },
  { nombre: "Container Unidad de Diálisis", dias: "LUNES" },

  // MARTES
  { nombre: "Residencias Portal El Rosario", dias: "MARTES" },
  { nombre: "IMA", dias: "MARTES" },
  { nombre: "Urb. Prados de la Villa", dias: "MARTES" },
  { nombre: "San Andrés", dias: "MARTES" },
  { nombre: "Sector Venezuela", dias: "MARTES" },
  { nombre: "Calle Dabajuro", dias: "MARTES" },
  { nombre: "C.D.I. San Andres", dias: "MARTES" },
  { nombre: "Sector Rafael Caldera", dias: "MARTES" },
  { nombre: "Sector La Culebra", dias: "MARTES" },
  { nombre: "Sector Barrio Oscuro", dias: "MARTES" },
  { nombre: "Calle (La Curva)", dias: "MARTES" },

  // MIERCOLES
  { nombre: "Urb. Villa Karelis", dias: "MIERCOLES" },
  { nombre: "Residencias Villa Encantada", dias: "MIERCOLES" },
  { nombre: "Calle Adolfo López", dias: "MIERCOLES" },
  { nombre: "Calle El Pantano", dias: "MIERCOLES" },
  { nombre: "Santa Teresa", dias: "MIERCOLES" },
  { nombre: "Sector San José", dias: "MIERCOLES" },
  { nombre: "Calle Bolívar", dias: "MIERCOLES" },
  { nombre: "sector Inmaculada", dias: "MIERCOLES" },
  { nombre: "Sector Aurora I", dias: "MIERCOLES" },
  { nombre: "Sector Aurora II", dias: "MIERCOLES" },

  // JUEVES
  { nombre: "Residencias Villa Nueva", dias: "JUEVES" },
  { nombre: "Residencias Los Angeles", dias: "JUEVES" },
  { nombre: "Urb. Rodolfito Rincon", dias: "JUEVES" },
  { nombre: "Residencias Villa Hermosa", dias: "JUEVES" },
  { nombre: "Calle Jesús Enrique Lozada", dias: "JUEVES" },
  { nombre: "Calle Gerico", dias: "JUEVES" },
  { nombre: "Calle Vargas", dias: "JUEVES" },
  { nombre: "Calle 18 de Octubre", dias: "JUEVES" },
  { nombre: "Sector Corito", dias: "JUEVES" },
  { nombre: "San Francisco de corito", dias: "JUEVES" },
  { nombre: "Calle concepción", dias: "JUEVES" },
  { nombre: "Calle falcón", dias: "JUEVES" },
  { nombre: "Sector Trujillo I", dias: "JUEVES" },
  { nombre: "Sector Trujillo II", dias: "JUEVES" },
  { nombre: "Sector Trujillo III", dias: "JUEVES" },

  // VIERNES
  { nombre: "Calle Municipal", dias: "VIERNES" },
  { nombre: "Sector Los Pereguetos", dias: "VIERNES" },
  { nombre: "Sectos Las Cayapas", dias: "VIERNES" },
  { nombre: "Sector la cueva", dias: "VIERNES" },
  { nombre: "Sector Amparo", dias: "VIERNES" },
  { nombre: "Sector juan Gil", dias: "VIERNES" },
  { nombre: "2 de febrero", dias: "VIERNES" },
  { nombre: "El Delirio", dias: "VIERNES" },
  { nombre: "Sector 6 de Agosto", dias: "VIERNES" },
  { nombre: "Sector Valdemar Sandoval", dias: "VIERNES" },
  { nombre: "La victoria", dias: "VIERNES" },
  { nombre: "C.D.I Ilapeca", dias: "VIERNES" },
  { nombre: "Sector Las Palmeras", dias: "VIERNES" },
  { nombre: "Sector Delicias", dias: "VIERNES" },

  // SABADO
  { nombre: "Av. 18 Maestra Sara Zegarra", dias: "SABADO" },
  { nombre: "Residencias Los Carrasco", dias: "SABADO" },
  { nombre: "Sector los Haticos", dias: "SABADO Y DOMINGO" },
  { nombre: "Sector el Carmen", dias: "SABADO" },
  { nombre: "Sector Altos de Jalisco Bicentenario", dias: "SABADO" },
  { nombre: "Sector la Melaza", dias: "SABADO" },
  { nombre: "Sector Noriega Trigo I", dias: "SABADO" },
  { nombre: "Sector Noriega Trigo II", dias: "SABADO" },
  { nombre: "Sector Ilapeca", dias: "SABADO" },
  { nombre: "Sector Cañada Larga", dias: "SABADO" },

  // DOMINGO
  { nombre: "Sector Puentecitos", dias: "DOMINGO" },
  { nombre: "Sector Arimpia", dias: "DOMINGO" },
  { nombre: "Sector Juan Gil 1", dias: "DOMINGO" },
  { nombre: "Sector Juan Gil 2", dias: "DOMINGO" },
  { nombre: "Sector Maticas", dias: "DOMINGO" },
  { nombre: "Sector Palmita", dias: "DOMINGO" },
];

async function run() {
  const parroquia = await prisma.parroquia.findFirst();
  if (!parroquia) throw new Error('No hay parroquia');

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const exists = await prisma.sector.findFirst({ where: { nombre: item.nombre } });
    if (!exists) {
      const sec = await prisma.sector.create({
        data: {
          codigo: 'SEC-' + i + '-' + Math.floor(Math.random()*1000),
          nombre: item.nombre,
          parroquiaId: parroquia.id
        }
      });
      await prisma.calleTramo.create({
        data: {
          sectorId: sec.id,
          nombreCalle: 'Ruta Principal',
          diaRecoleccion: item.dias
        }
      });
    } else {
      await prisma.calleTramo.updateMany({
        where: { sectorId: exists.id },
        data: { diaRecoleccion: item.dias }
      });
    }
  }
}
run().finally(() => prisma.$disconnect());
