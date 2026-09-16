class ApiConfig {
  // Configuración de Servidor de la Alcaldía
  // En emulador Android estándar: http://10.0.2.2:5000
  // En dispositivo físico o pruebas locales: cambiar a la IP local de tu PC (ej: http://192.168.1.100:5000)
  static String baseUrl = 'http://10.0.2.2:5000';

  static String get censoEndpoint => '$baseUrl/api/censo';
  static String get buscarCedulaEndpoint => '$baseUrl/api/censo/buscar';
  static String get authLoginEndpoint => '$baseUrl/api/auth/callback/credentials';

  static void setCustomHost(String host) {
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      baseUrl = 'http://$host:5000';
    } else {
      baseUrl = host;
    }
  }
}
