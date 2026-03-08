import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('en_US', null);
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // No .env: API_BASE_URL falls back to http://localhost:3000 in ApiClient
  }
  runApp(const HelixCareAIApp());
}
