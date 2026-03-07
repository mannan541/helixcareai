import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // No .env: API_BASE_URL falls back to http://localhost:3000 in ApiClient
  }
  runApp(const HelixCareAIApp());
}
