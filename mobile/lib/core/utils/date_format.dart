import 'package:intl/intl.dart';

/// English date/time formatting used across the app.
/// Uses en_US locale so dates always display in English (e.g. "4 Mar 2025").
const String _locale = 'en_US';

/// Date only: "4 Mar 2025"
String formatAppDate(DateTime dt) {
  return DateFormat('d MMM yyyy', _locale).format(dt);
}

/// YYYY-MM-DD formatted correctly to avoid timezone shift in APIs
String formatAppDateOnlyForApi(DateTime dt) {
  return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
}

/// Date and time: "4 Mar 2025, 2:30 PM"
String formatAppDateTime(DateTime dt) {
  return DateFormat('d MMM yyyy, h:mm a', _locale).format(dt);
}

/// Time only: "2:30 PM"
String formatAppTime(DateTime dt) {
  return DateFormat('h:mm a', _locale).format(dt);
}

/// Parses time string "HH:mm:ss" or "HH:mm" to "h:mm a"
String formatAppTimeString(String timeStr) {
  if (timeStr.trim().isEmpty) return timeStr;
  try {
    final parts = timeStr.trim().split(':');
    final dt = DateTime(2000, 1, 1, int.parse(parts[0]), int.parse(parts[1]));
    return formatAppTime(dt);
  } catch (_) {
    return timeStr;
  }
}

/// Long date (month name): "4 March 2025"
String formatAppDateLong(DateTime dt) {
  return DateFormat('d MMMM yyyy', _locale).format(dt);
}

/// Parses an ISO/date string and returns formatted date, or null if invalid.
String? formatAppDateFromString(String? dateStr) {
  if (dateStr == null || dateStr.trim().isEmpty) return null;
  final dt = DateTime.tryParse(dateStr.trim());
  return dt != null ? formatAppDate(dt) : null;
}

/// Parses an ISO/date string and returns formatted date+time, or null if invalid.
String? formatAppDateTimeFromString(String? dateStr) {
  if (dateStr == null || dateStr.trim().isEmpty) return null;
  final dt = DateTime.tryParse(dateStr.trim());
  return dt != null ? formatAppDateTime(dt) : null;
}
