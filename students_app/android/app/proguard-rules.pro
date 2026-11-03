# Flutter Core & Plugins
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Google Play Services & Firebase
-dontwarn com.google.android.gms.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.android.play.core.**

# Network & IO
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# Local notifications & plugins
-keep class com.dexterous.flutterlocalnotifications.** { *; }

# App Icon Badges (ShortcutBadger)
-dontwarn me.leolin.shortcutbadger.**
-keep class me.leolin.shortcutbadger.** { *; }
-keep interface me.leolin.shortcutbadger.** { *; }

# AndroidX NotificationCompat & Badging
-keep class androidx.core.app.NotificationCompat** { *; }
-keep class androidx.core.app.NotificationManagerCompat** { *; }
-keep class androidx.core.app.Person** { *; }

# Core Desugaring & Java Time
-dontwarn java.time.**
-dontwarn org.codehaus.mojo.animal_sniffer.**

# Preserve reflection and serialized models
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
