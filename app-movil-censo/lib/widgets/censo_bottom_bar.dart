import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../config/app_theme.dart';

class CensoBottomBar extends StatelessWidget {
  final VoidCallback onOpenModal;
  final LatLng? selectedCoord;
  final LatLng? currentGpsPos;
  final double? gpsAccuracy;
  final int censadosHoy;
  final int totalInmuebles;

  const CensoBottomBar({
    super.key,
    required this.onOpenModal,
    this.selectedCoord,
    this.currentGpsPos,
    this.gpsAccuracy,
    required this.censadosHoy,
    required this.totalInmuebles,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xE60F172A),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.primarySky.withOpacity(0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.6),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Barra de Estatus GPS y Estadísticas de Censo
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Indicador GPS
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppTheme.accentEmerald,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentEmerald.withOpacity(0.8),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    currentGpsPos != null
                        ? 'GPS Activo (±${gpsAccuracy?.round() ?? 5}m)'
                        : 'Buscando satélites...',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accentEmeraldLight,
                    ),
                  ),
                ],
              ),

              // Contadores
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Hoy: $censadosHoy',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryLight,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Total: $totalInmuebles',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Aviso si hay predio marcado en el mapa
          if (selectedCoord != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.accentEmerald.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.accentEmerald.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.place, size: 14, color: AppTheme.accentEmeraldLight),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Predio marcado: ${selectedCoord!.latitude.toStringAsFixed(6)}, ${selectedCoord!.longitude.toStringAsFixed(6)}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accentEmeraldLight,
                      ),
                    ),
                  ),
                  const Text(
                    'Listo',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.accentEmerald,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 10),

          // Botón Principal Táctil de Campo
          ElevatedButton(
            onPressed: onOpenModal,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primarySky,
              elevation: 4,
              shadowColor: AppTheme.primarySky.withOpacity(0.4),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add_home_work_outlined, size: 20),
                SizedBox(width: 10),
                Text(
                  'Censar Casa y Ciudadano',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
