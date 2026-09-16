import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../config/app_theme.dart';
import '../models/censo_models.dart';
import '../services/api_service.dart';
import '../widgets/censo_bottom_bar.dart';
import '../widgets/censo_form_modal.dart';
import 'login_screen.dart';

class CensoMapScreen extends StatefulWidget {
  const CensoMapScreen({super.key});

  @override
  State<CensoMapScreen> createState() => _CensoMapScreenState();
}

class _CensoMapScreenState extends State<CensoMapScreen> {
  final MapController _mapController = MapController();

  // Estados del Mapa y GPS
  LatLng _currentPosition = const LatLng(10.3180, -72.3150); // Rosario de Perijá
  double _gpsAccuracy = 5.0;
  bool _gpsLoaded = false;
  LatLng? _selectedCoord;
  bool _satelliteView = true;

  // Estados de Datos
  List<SectorModel> _sectores = [];
  List<InmueblePinModel> _inmuebles = [];
  int _censadosHoy = 0;
  int _totalInmuebles = 0;
  bool _loadingData = true;

  @override
  void initState() {
    super.initState();
    _initLocation();
    _loadCensoData();
  }

  // Inicializar geolocalización GPS
  void _initLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _gpsLoaded = true);
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => _gpsLoaded = true);
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      setState(() => _gpsLoaded = true);
      return;
    }

    // Obtener posición inicial
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
        _gpsAccuracy = pos.accuracy;
        _gpsLoaded = true;
      });
      _mapController.move(_currentPosition, 17.5);
    } catch (_) {
      setState(() => _gpsLoaded = true);
    }

    // Escuchar cambios de ubicación en tiempo real
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 3,
      ),
    ).listen((Position pos) {
      if (mounted) {
        setState(() {
          _currentPosition = LatLng(pos.latitude, pos.longitude);
          _gpsAccuracy = pos.accuracy;
        });
      }
    });
  }

  void _loadCensoData() async {
    final res = await ApiService.fetchInitialCensoData();
    if (mounted) {
      setState(() {
        _loadingData = false;
        if (res['success'] == true) {
          _sectores = res['sectores'] ?? [];
          _inmuebles = res['inmuebles'] ?? [];
          _totalInmuebles = res['totalInmuebles'] ?? _inmuebles.length;
          _censadosHoy = res['censadosHoy'] ?? 0;
        }
      });
    }
  }

  void _recenterMap() {
    _mapController.move(_currentPosition, 18.0);
  }

  void _openCensoModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CensoFormModal(
        sectores: _sectores,
        selectedCoord: _selectedCoord,
        currentGpsPos: _currentPosition,
        onCensoGuardado: (nuevoInmueble) {
          if (nuevoInmueble != null) {
            setState(() {
              _inmuebles.insert(0, nuevoInmueble);
              _censadosHoy++;
              _totalInmuebles++;
              _selectedCoord = null;
            });
          }
        },
      ),
    );
  }

  void _showInmuebleDetails(InmueblePinModel inm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.home, color: AppTheme.primaryLight, size: 22),
            const SizedBox(width: 8),
            Text(inm.codigoCatastral, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ubicación: ${inm.numeroCasaLocal}', style: const TextStyle(fontWeight: FontWeight.w600)),
            if (inm.referenciaUbic != null)
              Text('Ref: ${inm.referenciaUbic}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            const SizedBox(height: 8),
            Text('Tipo: ${inm.tipoInmueble} (\${inm.tarifaBaseUsd.toStringAsFixed(2)})'),
            Text('Titular: ${inm.propietarioNombre ?? "Sin titular"}'),
            Text('Cédula: ${inm.propietarioCedula ?? "S/D"}'),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.accentEmerald.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                inm.estadoCuenta,
                style: const TextStyle(color: AppTheme.accentEmeraldLight, fontWeight: FontWeight.w800, fontSize: 11),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cerrar', style: TextStyle(color: AppTheme.primaryLight)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Generar marcadores
    List<Marker> markers = [];

    // 1. Marcador del Censista (Punto azul con halo)
    markers.add(
      Marker(
        point: _currentPosition,
        width: 38,
        height: 38,
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.primarySky,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primarySky.withOpacity(0.6),
                blurRadius: 16,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const Icon(Icons.person, color: Colors.white, size: 18),
        ),
      ),
    );

    // 2. Marcador del Predio Seleccionado
    if (_selectedCoord != null) {
      markers.add(
        Marker(
          point: _selectedCoord!,
          width: 50,
          height: 50,
          child: GestureDetector(
            onTap: _openCensoModal,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.accentEmerald,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.accentEmerald.withOpacity(0.6),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.add_location_alt, color: Colors.white, size: 20),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 3. Marcadores de Viviendas Censadas
    for (var inm in _inmuebles) {
      if (inm.latitud != 0 && inm.longitud != 0) {
        final isComercial = inm.tipoInmueble.contains('COMERCIAL');
        final color = isComercial ? AppTheme.warningAmber : AppTheme.primaryLight;

        markers.add(
          Marker(
            point: LatLng(inm.latitud, inm.longitud),
            width: 32,
            height: 32,
            child: GestureDetector(
              onTap: () => _showInmuebleDetails(inm),
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 4),
                  ],
                ),
                child: const Icon(Icons.home, color: Color(0xFF0F172A), size: 16),
              ),
            ),
          ),
        );
      }
    }

    return Scaffold(
      body: Stack(
        children: [
          // MAPA FLUTTER_MAP
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentPosition,
              initialZoom: 17.5,
              onTap: (tapPosition, point) {
                setState(() {
                  _selectedCoord = point;
                });
              },
            ),
            children: [
              // Capa de Mapa (Satelital o Calles)
              TileLayer(
                urlTemplate: _satelliteView
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.alcaldia.rosarioperija.censo',
                maxZoom: 19,
              ),

              // Capa de Marcadores
              MarkerLayer(markers: markers),
            ],
          ),

          // BARRA SUPERIOR DE CABECERA
          SafeArea(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xE60F172A),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 12),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.primarySky.withOpacity(0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.shield_outlined, color: AppTheme.primaryLight, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'CENSO TERRITORIAL',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Alcaldía de Rosario de Perijá',
                          style: TextStyle(fontSize: 10, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),

                  // Botón Cerrar Sesión
                  IconButton(
                    icon: const Icon(Icons.logout, size: 20, color: AppTheme.textSecondary),
                    onPressed: () async {
                      await ApiService.logout();
                      if (!mounted) return;
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                      );
                    },
                    tooltip: 'Cerrar Sesión',
                  ),
                ],
              ),
            ),
          ),

          // BOTONES FLOTANTES LATERALES (Recentrar GPS & Cambiar Capa Satélite)
          Positioned(
            top: 90,
            right: 14,
            child: Column(
              children: [
                // Toggle Satélite / Calles
                FloatingActionButton.small(
                  heroTag: 'toggle_layer',
                  backgroundColor: AppTheme.surface,
                  foregroundColor: AppTheme.primaryLight,
                  onPressed: () => setState(() => _satelliteView = !_satelliteView),
                  child: Icon(_satelliteView ? Icons.layers : Icons.satellite_alt),
                ),
                const SizedBox(height: 8),

                // Recentrar GPS
                FloatingActionButton.small(
                  heroTag: 'recenter_gps',
                  backgroundColor: AppTheme.primarySky,
                  foregroundColor: Colors.white,
                  onPressed: _recenterMap,
                  child: const Icon(Icons.my_location),
                ),
              ],
            ),
          ),

          // INSTRUCCIÓN HINT
          Positioned(
            top: 95,
            left: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xCC090D16),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.touch_app_outlined, size: 14, color: AppTheme.accentEmeraldLight),
                  SizedBox(width: 6),
                  Text(
                    'Toca el mapa para fijar la casa',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),

          // BARRA FLOTANTE INFERIOR DE ACCIONES
          Align(
            alignment: Alignment.bottomCenter,
            child: CensoBottomBar(
              onOpenModal: _openCensoModal,
              selectedCoord: _selectedCoord,
              currentGpsPos: _currentPosition,
              gpsAccuracy: _gpsAccuracy,
              censadosHoy: _censadosHoy,
              totalInmuebles: _totalInmuebles,
            ),
          ),
        ],
      ),
    );
  }
}
