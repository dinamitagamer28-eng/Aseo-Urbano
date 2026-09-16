class SectorModel {
  final String id;
  final String nombre;
  final String codigo;
  final String estrato;
  final double centroLat;
  final double centroLng;
  final List<CalleModel> calles;
  final List<TarifaModel> tarifas;

  SectorModel({
    required this.id,
    required this.nombre,
    required this.codigo,
    required this.estrato,
    required this.centroLat,
    required this.centroLng,
    required this.calles,
    required this.tarifas,
  });

  factory SectorModel.fromJson(Map<String, dynamic> json) {
    var callesList = (json['callesTramos'] as List?)
            ?.map((c) => CalleModel.fromJson(c))
            .toList() ??
        [];
    var tarifasList = (json['tarifasSectores'] as List?)
            ?.map((t) => TarifaModel.fromJson(t))
            .toList() ??
        [];

    return SectorModel(
      id: json['id'] ?? '',
      nombre: json['nombre'] ?? '',
      codigo: json['codigo'] ?? '',
      estrato: json['estrato'] ?? 'POPULAR',
      centroLat: (json['centroLat'] as num?)?.toDouble() ?? 10.3180,
      centroLng: (json['centroLng'] as num?)?.toDouble() ?? -72.3150,
      calles: callesList,
      tarifas: tarifasList,
    );
  }
}

class CalleModel {
  final String id;
  final String nombreCalle;

  CalleModel({required this.id, required this.nombreCalle});

  factory CalleModel.fromJson(Map<String, dynamic> json) {
    return CalleModel(
      id: json['id'] ?? '',
      nombreCalle: json['nombreCalle'] ?? '',
    );
  }
}

class TarifaModel {
  final String tipoInmueble;
  final double montoTarifaUsd;

  TarifaModel({required this.tipoInmueble, required this.montoTarifaUsd});

  factory TarifaModel.fromJson(Map<String, dynamic> json) {
    return TarifaModel(
      tipoInmueble: json['tipoInmueble'] ?? 'RESIDENCIAL',
      montoTarifaUsd: (json['montoTarifaUsd'] as num?)?.toDouble() ?? 2.0,
    );
  }
}

class InmueblePinModel {
  final String id;
  final String codigoCatastral;
  final String numeroCasaLocal;
  final String? referenciaUbic;
  final String tipoInmueble;
  final double tarifaBaseUsd;
  final String estadoCuenta;
  final double latitud;
  final double longitud;
  final String? sectorNombre;
  final String? calleNombre;
  final String? propietarioNombre;
  final String? propietarioCedula;

  InmueblePinModel({
    required this.id,
    required this.codigoCatastral,
    required this.numeroCasaLocal,
    this.referenciaUbic,
    required this.tipoInmueble,
    required this.tarifaBaseUsd,
    required this.estadoCuenta,
    required this.latitud,
    required this.longitud,
    this.sectorNombre,
    this.calleNombre,
    this.propietarioNombre,
    this.propietarioCedula,
  });

  factory InmueblePinModel.fromJson(Map<String, dynamic> json) {
    return InmueblePinModel(
      id: json['id'] ?? '',
      codigoCatastral: json['codigoCatastral'] ?? '',
      numeroCasaLocal: json['numeroCasaLocal'] ?? '',
      referenciaUbic: json['referenciaUbic'],
      tipoInmueble: json['tipoInmueble'] ?? 'RESIDENCIAL',
      tarifaBaseUsd: (json['tarifaBaseUsd'] as num?)?.toDouble() ?? 2.0,
      estadoCuenta: json['estadoCuenta'] ?? 'SOLVENTE',
      latitud: (json['latitud'] as num?)?.toDouble() ?? 0.0,
      longitud: (json['longitud'] as num?)?.toDouble() ?? 0.0,
      sectorNombre: json['sectorNombre'],
      calleNombre: json['calleNombre'],
      propietarioNombre: json['propietarioNombre'],
      propietarioCedula: json['propietarioCedula'],
    );
  }
}

class CitizenSearchResult {
  final bool encontrado;
  final String? nombres;
  final String? apellidos;
  final String? telefonoMovil;
  final String? email;

  CitizenSearchResult({
    required this.encontrado,
    this.nombres,
    this.apellidos,
    this.telefonoMovil,
    this.email,
  });

  factory CitizenSearchResult.fromJson(Map<String, dynamic> json) {
    final bool enc = json['encontrado'] == true;
    final user = json['usuario'];
    return CitizenSearchResult(
      encontrado: enc,
      nombres: user != null ? user['nombres'] : null,
      apellidos: user != null ? user['apellidos'] : null,
      telefonoMovil: user != null ? user['telefonoMovil'] : null,
      email: user != null ? user['email'] : null,
    );
  }
}
