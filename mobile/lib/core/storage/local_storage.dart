import 'package:shared_preferences/shared_preferences.dart';

class LocalStorage {
  static const _tokenKey = 'auth_token';
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static String? getToken() {
    return _prefs?.getString(_tokenKey);
  }

  static Future<void> setToken(String? token) async {
    if (token == null) {
      await _prefs?.remove(_tokenKey);
    } else {
      await _prefs?.setString(_tokenKey, token);
    }
  }
}
