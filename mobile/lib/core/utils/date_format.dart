import 'package:intl/intl.dart';

/// English date/time formatting used across the app.
/// Uses en_US locale so dates always display in English (e.g. "4 Mar 2025").
const String _locale = 'en_US';

/// Date only: "4 Mar 2025"
String formatAppDate(DateTime dt) {
  return DateFormat('d MMM yyyy', _locale).format(dt);
}

/// Date and time: "4 Mar 2025, 2:30 PM"
String formatAppDateTime(DateTime dt) {
  return DateFormat('d MMM yyyy, h:mm a', _locale).format(dt);
}

/// Time only: "2:30 PM"
String formatAppTime(DateTime dt) {
  return DateFormat('h:mm a', _locale).format(dt);
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
