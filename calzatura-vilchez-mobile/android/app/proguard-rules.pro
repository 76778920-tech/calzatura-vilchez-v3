# Flutter / Dart (R8)
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Firebase / Play Services (usados vía google-services)
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn com.google.errorprone.annotations.**
