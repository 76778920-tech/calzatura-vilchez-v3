import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../features/cart/domain/cart_item.dart';

/// Persistencia local del carrito (misma convención que la web: `calzatura_cart[:uid]`).
class LocalCartStore {
  static const guestKey = 'calzatura_cart';

  static String userKey(String uid) => '$guestKey:$uid';

  static Future<List<CartItem>> read(String? uid) async {
    final prefs = await SharedPreferences.getInstance();
    if (uid != null) {
      final userItems = _decode(prefs.getString(userKey(uid)));
      if (userItems.isNotEmpty) return userItems;

      final guestItems = _decode(prefs.getString(guestKey));
      if (guestItems.isNotEmpty) {
        await write(uid, guestItems);
        await prefs.remove(guestKey);
        return guestItems;
      }
      return [];
    }
    return _decode(prefs.getString(guestKey));
  }

  static Future<void> write(String? uid, List<CartItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    final key = uid != null ? userKey(uid) : guestKey;
    final encoded = jsonEncode(items.map((e) => e.toMap()).toList());
    await prefs.setString(key, encoded);
  }

  static List<CartItem> _decode(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final parsed = jsonDecode(raw);
      if (parsed is! List) return [];
      return parsed
          .whereType<Map>()
          .map((e) => CartItem.fromMap(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
