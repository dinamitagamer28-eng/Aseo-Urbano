import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'config/app_theme.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/censo_map_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configurar barra de estado transparente y estilo oscuro
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final bool loggedIn = await ApiService.isSessionActive();

  runApp(CensoAlcaldiaApp(initialLoggedIn: loggedIn));
}

class CensoAlcaldiaApp extends StatelessWidget {
  final bool initialLoggedIn;

  const CensoAlcaldiaApp({super.key, required this.initialLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Censo Territorial - Alcaldía de Rosario de Perijá',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: initialLoggedIn ? const CensoMapScreen() : const LoginScreen(),
    );
  }
}
