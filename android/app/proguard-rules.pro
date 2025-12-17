# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Agora RTC

# React Native
keep class io.agora.** { *; }
keep class io.agora.rtc.** { *; }
keep class io.agora.base.** { *; }
keep class io.agora.base.internal.** { *; }
keepclasseswithmembernames class io.agora.** {
	native <methods>;
}
dontwarn io.agora.**
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class expo.modules.** { *; }
-keep class versioned.host.exp.exponent.** { *; }
-dontwarn expo.modules.**

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Google Sign In
-keep class com.google.android.gms.auth.** { *; }

# React Native Maps
-keep class com.google.android.gms.maps.** { *; }

# Add any project specific keep options here:
