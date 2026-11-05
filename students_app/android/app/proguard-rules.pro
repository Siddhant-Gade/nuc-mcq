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

# OpenFile plugin & FileProvider
-dontwarn com.crazecoder.openfile.**
-keep class com.crazecoder.openfile.** { *; }
-keep class androidx.core.content.FileProvider { *; }

# App Links / Deep Linking
-dontwarn com.llfbandit.app_links.**
-keep class com.llfbandit.app_links.** { *; }

# Webview & YouTube Player
-keepclassmembers class * extends android.webkit.WebViewClient {
   public void *(android.webkit.WebView, java.lang.String);
   public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
   public void *(android.webkit.WebView, java.lang.String);
}
-dontwarn android.webkit.**
-keep class android.webkit.** { *; }

# Core Desugaring & Java Time
-dontwarn java.time.**
-dontwarn org.codehaus.mojo.animal_sniffer.**

# Preserve reflection and serialized models
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
