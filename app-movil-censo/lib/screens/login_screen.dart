import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/api_service.dart';
import 'censo_map_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  final _claveEmpleadoController = TextEditingController(text: 'ADMIN2026');

  bool _loading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    _claveEmpleadoController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _errorMsg = null;
    });

    final res = await ApiService.loginStaff(
      usuario: _userController.text.trim(),
      password: _passwordController.text.trim(),
      claveEmpleado: _claveEmpleadoController.text.trim(),
    );

    setState(() {
      _loading = false;
    });

    if (res['success'] == true) {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const CensoMapScreen()),
      );
    } else {
      setState(() {
        _errorMsg = res['error'] ?? 'Acceso denegado.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo Institucional
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppTheme.primarySky.withOpacity(0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primarySky.withOpacity(0.25),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shield_outlined,
                        size: 38,
                        color: AppTheme.primaryLight,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Título
                  const Text(
                    'Censo Territorial Municipal',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Alcaldía del Municipio Rosario de Perijá',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Badge de advertencia de uso exclusivo
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.warningAmber.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.warningAmber.withOpacity(0.35)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outline, size: 12, color: AppTheme.warningAmber),
                          SizedBox(width: 4),
                          Text(
                            'USO EXCLUSIVO FUNCIONARIOS',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.warningAmber,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Mensaje de Error
                  if (_errorMsg != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.errorRed.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.errorRed.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppTheme.errorRed, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMsg!,
                              style: const TextStyle(
                                color: Color(0xFFFCA5A5),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Campo Usuario / Cédula
                  TextFormField(
                    controller: _userController,
                    decoration: const InputDecoration(
                      labelText: 'Cédula o Correo del Funcionario',
                      hintText: 'Ej. V-30643300 o censista@rosario.gob',
                      prefixIcon: Icon(Icons.badge_outlined, color: AppTheme.primaryLight, size: 20),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty
                        ? 'Ingrese su cédula o usuario'
                        : null,
                  ),
                  const SizedBox(height: 14),

                  // Campo Contraseña
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Contraseña de Acceso',
                      hintText: '••••••••',
                      prefixIcon: Icon(Icons.key_outlined, color: AppTheme.primaryLight, size: 20),
                    ),
                    validator: (val) => val == null || val.length < 4
                        ? 'Mínimo 4 caracteres'
                        : null,
                  ),
                  const SizedBox(height: 14),

                  // Campo Clave de Empleado de la Alcaldía
                  TextFormField(
                    controller: _claveEmpleadoController,
                    decoration: InputDecoration(
                      labelText: 'Clave de Empleado Municipal',
                      hintText: 'Ej. ADMIN2026 o CUADRILLA2026',
                      prefixIcon: const Icon(Icons.verified_user_outlined, color: AppTheme.warningAmber, size: 20),
                      fillColor: const Color(0xFF0F172A),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppTheme.warningAmber, width: 2),
                      ),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty
                        ? 'Ingrese la clave de empleado de la Alcaldía'
                        : null,
                  ),
                  const SizedBox(height: 24),

                  // Botón Iniciar Sesión en Campo
                  ElevatedButton(
                    onPressed: _loading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primarySky,
                      elevation: 4,
                      shadowColor: AppTheme.primarySky.withOpacity(0.5),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.login, size: 20),
                              SizedBox(width: 8),
                              Text('Ingresar al Sistema de Censo'),
                            ],
                          ),
                  ),

                  const SizedBox(height: 32),
                  const Text(
                    'Dirección de Catastro y Servicios Públicos\nRosario de Perijá • Edo. Zulia',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
