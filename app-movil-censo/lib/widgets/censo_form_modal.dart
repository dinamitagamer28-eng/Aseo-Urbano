import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../config/app_theme.dart';
import '../models/censo_models.dart';
import '../services/api_service.dart';

class CensoFormModal extends StatefulWidget {
  final List<SectorModel> sectores;
  final LatLng? selectedCoord;
  final LatLng? currentGpsPos;
  final Function(InmueblePinModel? nuevoInmueble) onCensoGuardado;

  const CensoFormModal({
    super.key,
    required this.sectores,
    this.selectedCoord,
    this.currentGpsPos,
    required this.onCensoGuardado,
  });

  @override
  State<CensoFormModal> createState() => _CensoFormModalState();
}

class _CensoFormModalState extends State<CensoFormModal>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Estados de Vivienda
  SectorModel? _selectedSector;
  CalleModel? _selectedCalle;
  final _numeroCasaController = TextEditingController();
  final _referenciaController = TextEditingController();
  String _tipoInmueble = 'RESIDENCIAL';
  double _tarifaBaseUsd = 2.0;
  double? _latitud;
  double? _longitud;

  // Estados de Ciudadano
  String _tipoDoc = 'V';
  final _cedulaController = TextEditingController();
  final _nombresController = TextEditingController();
  final _apellidosController = TextEditingController();
  final _telefonoController = TextEditingController();
  final _emailController = TextEditingController();
  String _tipoRelacion = 'PROPIETARIO';
  int _numHabitantes = 3;
  bool _esResponsablePago = true;

  bool _searchingCedula = false;
  bool _submitting = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    if (widget.sectores.isNotEmpty) {
      _selectedSector = widget.sectores.first;
      if (_selectedSector!.calles.isNotEmpty) {
        _selectedCalle = _selectedSector!.calles.first;
      }
    }

    final coord = widget.selectedCoord ?? widget.currentGpsPos;
    if (coord != null) {
      _latitud = coord.latitude;
      _longitud = coord.longitude;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _numeroCasaController.dispose();
    _referenciaController.dispose();
    _cedulaController.dispose();
    _nombresController.dispose();
    _apellidosController.dispose();
    _telefonoController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onTipoInmuebleChanged(String? newTipo) {
    if (newTipo == null) return;
    setState(() {
      _tipoInmueble = newTipo;
      if (_selectedSector != null) {
        final tarifa = _selectedSector!.tarifas
            .firstWhere((t) => t.tipoInmueble == newTipo,
                orElse: () => TarifaModel(tipoInmueble: newTipo, montoTarifaUsd: 2.0));
        _tarifaBaseUsd = tarifa.montoTarifaUsd;
      }
    });
  }

  void _searchCedula() async {
    final cedula = _cedulaController.text.trim();
    if (cedula.isEmpty) return;

    setState(() {
      _searchingCedula = true;
      _errorMsg = null;
    });

    final res = await ApiService.searchCitizen('$_tipoDoc-$cedula');

    setState(() {
      _searchingCedula = false;
    });

    if (res.encontrado) {
      _nombresController.text = res.nombres ?? '';
      _apellidosController.text = res.apellidos ?? '';
      _telefonoController.text = res.telefonoMovil ?? '';
      _emailController.text = res.email ?? '';
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('¡Ciudadano encontrado en el padrón municipal!'),
          backgroundColor: AppTheme.accentEmerald,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _handleSubmit() async {
    if (_numeroCasaController.text.trim().isEmpty) {
      setState(() {
        _errorMsg = 'Ingrese el número o identificación de la casa.';
      });
      _tabController.animateTo(0);
      return;
    }

    if (_cedulaController.text.trim().isEmpty ||
        _nombresController.text.trim().isEmpty) {
      setState(() {
        _errorMsg = 'Complete la cédula y nombre del habitante / responsable.';
      });
      _tabController.animateTo(1);
      return;
    }

    setState(() {
      _submitting = true;
      _errorMsg = null;
    });

    final payload = {
      'sectorId': _selectedSector?.id ?? 'sec-colinas',
      'calleId': _selectedCalle?.id ?? (_selectedSector?.calles.first.id ?? ''),
      'numeroCasaLocal': _numeroCasaController.text.trim(),
      'referenciaUbic': _referenciaController.text.trim(),
      'tipoInmueble': _tipoInmueble,
      'tarifaBaseUsd': _tarifaBaseUsd,
      'latitud': _latitud,
      'longitud': _longitud,
      'tipoDoc': _tipoDoc,
      'cedulaNumero': _cedulaController.text.trim(),
      'nombres': _nombresController.text.trim(),
      'apellidos': _apellidosController.text.trim(),
      'telefonoMovil': _telefonoController.text.trim(),
      'email': _emailController.text.trim(),
      'tipoRelacion': _tipoRelacion,
      'esResponsablePago': _esResponsablePago,
    };

    final res = await ApiService.submitCensusRecord(payload);

    setState(() {
      _submitting = false;
    });

    if (res['success'] == true) {
      if (!mounted) return;
      widget.onCensoGuardado(res['inmueble']);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['mensaje'] ?? '¡Censo registrado exitosamente!'),
          backgroundColor: AppTheme.accentEmerald,
          duration: const Duration(seconds: 3),
        ),
      );
    } else {
      setState(() {
        _errorMsg = res['error'] ?? 'Error al guardar el censo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Barra de Arrastre
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // Cabecera del Modal
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primarySky.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.apartment_rounded, color: AppTheme.primaryLight, size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Registro de Censo en Campo',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        'Vivienda y Habitantes • Alcaldía de Rosario',
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: AppTheme.textSecondary, size: 20),
                ),
              ],
            ),
          ),

          // Tabs
          TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.primarySky,
            labelColor: AppTheme.primaryLight,
            unselectedLabelColor: AppTheme.textMuted,
            tabs: const [
              Tab(icon: Icon(Icons.home_outlined, size: 18), text: '1. Vivienda'),
              Tab(icon: Icon(Icons.person_outline, size: 18), text: '2. Habitante'),
            ],
          ),

          if (_errorMsg != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Text(
                _errorMsg!,
                style: const TextStyle(color: AppTheme.errorRed, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),

          // Contenido de Tabs
          SizedBox(
            height: 380,
            child: TabBarView(
              controller: _tabController,
              children: [
                // TAB 1: Vivienda
                SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Coordenadas
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.gps_fixed, size: 16, color: AppTheme.accentEmerald),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _latitud != null
                                    ? 'GPS: ${_latitud!.toStringAsFixed(6)}, ${_longitud!.toStringAsFixed(6)}'
                                    : 'Sin coordenadas (Usa el mapa)',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                            if (widget.currentGpsPos != null)
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _latitud = widget.currentGpsPos!.latitude;
                                    _longitud = widget.currentGpsPos!.longitude;
                                  });
                                },
                                child: const Text('Actual', style: TextStyle(fontSize: 11)),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Sector
                      if (widget.sectores.isNotEmpty)
                        DropdownButtonFormField<SectorModel>(
                          value: _selectedSector,
                          decoration: const InputDecoration(labelText: 'Sector'),
                          items: widget.sectores
                              .map((s) => DropdownMenuItem(value: s, child: Text(s.nombre, style: const TextStyle(fontSize: 13))))
                              .toList(),
                          onChanged: (s) {
                            setState(() {
                              _selectedSector = s;
                              _selectedCalle = s?.calles.isNotEmpty == true ? s!.calles.first : null;
                            });
                          },
                        ),
                      const SizedBox(height: 12),

                      // Calle
                      if (_selectedSector?.calles.isNotEmpty == true)
                        DropdownButtonFormField<CalleModel>(
                          value: _selectedCalle,
                          decoration: const InputDecoration(labelText: 'Calle / Tramo'),
                          items: _selectedSector!.calles
                              .map((c) => DropdownMenuItem(value: c, child: Text(c.nombreCalle, style: const TextStyle(fontSize: 13))))
                              .toList(),
                          onChanged: (c) => setState(() => _selectedCalle = c),
                        ),
                      const SizedBox(height: 12),

                      // Número Casa
                      TextFormField(
                        controller: _numeroCasaController,
                        decoration: const InputDecoration(
                          labelText: 'Número de Casa o Local *',
                          hintText: 'Ej. Casa #42-B o Local Don Pedro',
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Referencia
                      TextFormField(
                        controller: _referenciaController,
                        decoration: const InputDecoration(
                          labelText: 'Punto de Referencia',
                          hintText: 'Ej. Frente a la plaza, esquina cancha',
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Tipo de Inmueble y Tarifa
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              value: _tipoInmueble,
                              decoration: const InputDecoration(labelText: 'Tipo Inmueble'),
                              items: const [
                                DropdownMenuItem(value: 'RESIDENCIAL', child: Text('Residencial')),
                                DropdownMenuItem(value: 'COMERCIAL_PEQ', child: Text('Comercio Pequeño')),
                                DropdownMenuItem(value: 'COMERCIAL_GDE', child: Text('Gran Comercio')),
                                DropdownMenuItem(value: 'BALDIO', child: Text('Terreno Baldío')),
                              ],
                              onChanged: _onTipoInmuebleChanged,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                              decoration: BoxDecoration(
                                color: AppTheme.card,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Tarifa USD', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                                  Text('\$$_tarifaBaseUsd', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.accentEmeraldLight)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // TAB 2: Habitante
                SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Cédula con búsqueda
                      Row(
                        children: [
                          SizedBox(
                            width: 75,
                            child: DropdownButtonFormField<String>(
                              value: _tipoDoc,
                              decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 14)),
                              items: const [
                                DropdownMenuItem(value: 'V', child: Text('V-')),
                                DropdownMenuItem(value: 'E', child: Text('E-')),
                                DropdownMenuItem(value: 'J', child: Text('J-')),
                                DropdownMenuItem(value: 'G', child: Text('G-')),
                              ],
                              onChanged: (v) => setState(() => _tipoDoc = v ?? 'V'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: _cedulaController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Cédula / RIF *',
                                hintText: '18456789',
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton.filled(
                            onPressed: _searchingCedula ? null : _searchCedula,
                            icon: _searchingCedula
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.search, size: 20),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Nombres y Apellidos
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _nombresController,
                              decoration: const InputDecoration(labelText: 'Nombres *'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _apellidosController,
                              decoration: const InputDecoration(labelText: 'Apellidos'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Teléfono WhatsApp
                      TextFormField(
                        controller: _telefonoController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Teléfono WhatsApp',
                          hintText: '0414-1234567',
                          prefixIcon: Icon(Icons.phone_outlined, size: 18),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Relación con el Inmueble
                      DropdownButtonFormField<String>(
                        value: _tipoRelacion,
                        decoration: const InputDecoration(labelText: 'Relación con el Inmueble'),
                        items: const [
                          DropdownMenuItem(value: 'PROPIETARIO', child: Text('Propietario')),
                          DropdownMenuItem(value: 'ARRENDATARIO', child: Text('Inquilino / Arrendatario')),
                          DropdownMenuItem(value: 'FAMILIAR', child: Text('Familiar a Cargo')),
                          DropdownMenuItem(value: 'REPRESENTANTE', child: Text('Representante Legal')),
                        ],
                        onChanged: (r) => setState(() => _tipoRelacion = r ?? 'PROPIETARIO'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Botón Guardar Censo
          Padding(
            padding: const EdgeInsets.all(16),
            child: ElevatedButton(
              onPressed: _submitting ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentEmerald,
              ),
              child: _submitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : const Text('Confirmar y Guardar Censo', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ),
        ],
      ),
    );
  }
}
