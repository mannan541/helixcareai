import 'package:equatable/equatable.dart';

class NotificationEntity extends Equatable {
  final String id;
  final String type;
  final String title;
  final String? body;
  final DateTime? readAt;
  final DateTime createdAt;
  final Map<String, dynamic> meta;

  const NotificationEntity({
    required this.id,
    required this.type,
    required this.title,
    this.body,
    this.readAt,
    required this.createdAt,
    this.meta = const {},
  });

  bool get isUnread => readAt == null;

  @override
  List<Object?> get props => [id, type, title, body, readAt, createdAt, meta];
}
