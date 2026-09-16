import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/censo_models.dart';

class ApiService {
  // 1. Obtener Sectores y Predios Censados
  static Future<Map<String, dynamic>> fetchInitialCensoData() async {
    try {
      final response = await http
          .get(Uri.parse(ApiConfig.censoEndpoint))
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Guardar copia local para soporte offline
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cache_censo_initial', response.body);

        List<SectorModel> sectores = (data['sectores'] as List?)
                ?.map((s) => SectorModel.fromJson(s))
                .toList() ??
            [];

        List<InmueblePinModel> inmuebles = (data['inmuebles'] as List?)
                ?.map((i) => InmueblePinModel.fromJson(i))
                .toList() ??
            [];

        return {
          'success': true,
          'totalInmuebles': data['totalInmuebles'] ?? inmuebles.length,
          'censadosHoy': data['censadosHoy'] ?? 0,
          'sectores': sectores,
          'inmuebles': inmuebles,
        };
      } else {
        return _loadCachedCensoData();
      }
    } catch (e) {
      print('Aviso de conexión: usando cache offline. Detalle: $e');
      return _loadCachedCensoData();
    }
  }

  // Carga desde cache local si no hay internet en campo
  static Future<Map<String, dynamic>> _loadCachedCensoData() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cache_censo_initial');
    if (cached != null) {
      final data = jsonDecode(cached);
      List<SectorModel> sectores = (data['sectores'] as List?)
              ?.map((s) => SectorModel.fromJson(s))
              .toList() ??
          [];
      List<InmueblePinModel> inmuebles = (data['inmuebles'] as List?)
              ?.map((i) => InmueblePinModel.fromJson(i))
              .toList() ??
          [];
      return {
        'success': true,
        'isOffline': true,
        'totalInmuebles': inmuebles.length,
        'censadosHoy': 0,
        'sectores': sectores,
        'inmuebles': inmuebles,
      };
    }

    // Fallback mínimo estático si es el primer arranque sin red
    return {
      'success': true,
      'isOffline': true,
      'totalInmuebles': 0,
      'censadosHoy': 0,
      'sectores': [
        SectorModel(
          id: 'sec-colinas',
          nombre: 'Sector Las Colinas',
          codigo: 'COLINAS',
          estrato: 'POPULAR',
          centroLat: 10.3180,
          centroLng: -72.3150,
          calles: [
            CalleModel(id: 'c1', nombreCalle: 'Calle 1 Principal'),
            CalleModel(id: 'c2', nombreCalle: 'Calle 2 Los Pinos'),
          ],
          tarifas: [
            TarifaModel(tipoInmueble: 'RESIDENCIAL', montoTarifaUsd: 2.0),
            TarifaModel(tipoInmueble: 'COMERCIAL_PEQ', montoTarifaUsd: 8.0),
          ],
        )
      ],
      'inmuebles': [],
    };
  }

  // 2. Buscar Ciudadano por Cédula (Autocompletado)
  static Future<CitizenSearchResult> searchCitizen(String cedula) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.buscarCedulaEndpoint),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'cedula': cedula}),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return CitizenSearchResult.fromJson(jsonDecode(response.body));
      }
    } catch (_) {}
    return CitizenSearchResult(encontrado: false);
  }

  // 3. Enviar Registro de Censo
  static Future<Map<String, dynamic>> submitCensusRecord(
      Map<String, dynamic> payload) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.censoEndpoint),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final resData = jsonDecode(response.body);
        return {
          'success': true,
          'mensaje': resData['mensaje'] ?? '¡Censo guardado exitosamente!',
          'inmueble': resData['inmueble'] != null
              ? InmueblePinModel.fromJson(resData['inmueble'])
              : null,
        };
      } else {
        final err = jsonDecode(response.body);
        return {
          'success': false,
          'error': err['error'] ?? 'Error al registrar el censo',
        };
      }
    } catch (e) {
      // Guardar en cola offline para reintento automático
      await _savePendingOfflineCensus(payload);
      return {
        'success': true,
        'offlineSaved': true,
        'mensaje': 'Guardado en almacenamiento local (se sincronizará al conectar).',
      };
    }
  }

  static Future<void> _savePendingOfflineCensus(
      Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> queue = prefs.getStringList('offline_census_queue') ?? [];
    queue.add(jsonEncode(payload));
    await prefs.setStringList('offline_census_queue', queue);
  }

  // 4. Autenticación Exclusiva para la Alcaldía
  static Future<Map<String, dynamic>> loginStaff({
    required String usuario,
    required String password,
    required String claveEmpleado,
  }) async {
    final cleanKey = claveEmpleado.trim().toUpperCase();

    // Verificación de clave de empleado municipal
    bool esClaveValida = (cleanKey == 'ADMIN2026' ||
        cleanKey == 'ROSARIO2026' ||
        cleanKey == 'CUADRILLA2026' ||
        cleanKey == 'CAMPO2026' ||
        cleanKey == 'CENSO2026');

    if (!esClaveValida) {
      return {
        'success': false,
        'error': 'Clave de Empleado inválida. Este aplicativo es de uso exclusivo para personal de la Alcaldía.',
      };
    }

    if (password.length < 4) {
      return {
        'success': false,
        'error': 'La contraseña debe tener al menos 4 caracteres.',
      };
    }

    String rol = (cleanKey == 'ADMIN2026' || cleanKey == 'ROSARIO2026')
        ? 'ADMIN_CATASTRO'
        : 'CENSISTA_MUNICIPAL';

    // Guardar sesión en el teléfono
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('staff_user', usuario);
    await prefs.setString('staff_role', rol);
    await prefs.setBool('is_authenticated', true);

    return {
      'success': true,
      'usuario': usuario,
      'rol': rol,
    };
  }

  static Future<bool> isSessionActive() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('is_authenticated') ?? false;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('is_authenticated');
    await prefs.remove('staff_role');
  }
}
