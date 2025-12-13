import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'tiktok' | 'snapchat';
  onPress: () => void;
  style?: ViewStyle;
}

const providerConfig = {
  google: {
    icon: 'logo-google' as keyof typeof Ionicons.glyphMap,
    label: 'Continue with Google',
    bgColor: '#fff',
    textColor: '#000',
    iconColor: '#DB4437',
  },
  apple: {
    icon: 'logo-apple' as keyof typeof Ionicons.glyphMap,
    label: 'Continue with Apple',
    bgColor: '#fff',
    textColor: '#000',
    iconColor: '#000',
  },
  tiktok: {
    icon: 'logo-tiktok' as keyof typeof Ionicons.glyphMap,
    label: 'Continue with TikTok',
    bgColor: '#000',
    textColor: '#fff',
    iconColor: '#fff',
  },
  snapchat: {
    icon: 'logo-snapchat' as keyof typeof Ionicons.glyphMap,
    label: 'Continue with Snap',
    bgColor: '#FFFC00',
    textColor: '#000',
    iconColor: '#000',
  },
};

export default function SocialButton({ provider, onPress, style }: SocialButtonProps) {
  const config = providerConfig[provider];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: config.bgColor },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={config.icon} size={20} color={config.iconColor} />
      </View>
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconContainer: {
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
