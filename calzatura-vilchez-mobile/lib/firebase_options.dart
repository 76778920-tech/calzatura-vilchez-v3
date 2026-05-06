import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions has not been configured for ${defaultTargetPlatform.name}.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo',
    appId: '1:337744526151:web:bc86b90832e667c36baa62',
    messagingSenderId: '337744526151',
    projectId: 'calzaturavilchez-ab17f',
    authDomain: 'calzaturavilchez-ab17f.firebaseapp.com',
    storageBucket: 'calzaturavilchez-ab17f.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAYMMfvHsK3qIdrSCBgCLI4CNPGcsyewno',
    appId: '1:337744526151:android:3d868dfd6d1bd81e6baa62',
    messagingSenderId: '337744526151',
    projectId: 'calzaturavilchez-ab17f',
    storageBucket: 'calzaturavilchez-ab17f.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo',
    appId: '1:337744526151:ios:a7b2c4d8e9f0a1b3',
    messagingSenderId: '337744526151',
    projectId: 'calzaturavilchez-ab17f',
    storageBucket: 'calzaturavilchez-ab17f.firebasestorage.app',
    iosBundleId: 'com.calzaturavilchez.calzaturaVilchezMobile',
  );
}
