import 'package:calzatura_vilchez_mobile/core/config/mobile_app_ids.dart';
import 'package:calzatura_vilchez_mobile/firebase_options.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Firebase iOS coincide con GoogleService-Info.plist', () {
    const ios = DefaultFirebaseOptions.ios;

    expect(ios.appId, '1:337744526151:ios:adde262e67f91bc36baa62');
    expect(ios.apiKey, 'AIzaSyAf75XdPUqT29NVhSgq7Blxs6U03b9sMuA');
    expect(ios.projectId, 'calzaturavilchez-ab17f');
    expect(ios.messagingSenderId, '337744526151');
    expect(ios.iosBundleId, MobileAppIds.iosBundleId);
  });
}
