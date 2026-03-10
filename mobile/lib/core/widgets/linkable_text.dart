import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class LinkableText extends StatelessWidget {
  final String text;
  final TextStyle? style;

  const LinkableText(this.text, {super.key, this.style});

  @override
  Widget build(BuildContext context) {
    final urlRegExp = RegExp(
        r"((https?|ftp)://|www\.)[^\s/$.?#].[^\s]*",
        caseSensitive: false);
    final spans = <TextSpan>[];
    int start = 0;

    for (final match in urlRegExp.allMatches(text)) {
      if (match.start > start) {
        spans.add(TextSpan(text: text.substring(start, match.start)));
      }
      final url = match.group(0)!;
      spans.add(TextSpan(
        text: url,
        style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
        recognizer: TapGestureRecognizer()
          ..onTap = () async {
            try {
              final uri = Uri.parse(url.startsWith('http') ? url : 'https://$url');
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            } catch (e) {
              debugPrint('Could not launch $url: $e');
            }
          },
      ));
      start = match.end;
    }
    if (start < text.length) {
      spans.add(TextSpan(text: text.substring(start)));
    }

    return SelectableText.rich(
      TextSpan(children: spans, style: style),
    );
  }
}
