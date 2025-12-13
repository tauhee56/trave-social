const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to add appAuthRedirectScheme to build.gradle
 * This ensures the placeholder is set even after expo prebuild
 */
const withAppAuthRedirectScheme = (config) => {
  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    let buildGradle = modResults.contents;

    // Check if manifestPlaceholders already exists
    if (buildGradle.includes('manifestPlaceholders')) {
      console.log('✅ manifestPlaceholders already exists in build.gradle');
      return config;
    }

    // Find defaultConfig block and add manifestPlaceholders
    const defaultConfigRegex = /(defaultConfig\s*\{[^}]*)(buildConfigField[^\n]*\n)/;
    
    if (defaultConfigRegex.test(buildGradle)) {
      buildGradle = buildGradle.replace(
        defaultConfigRegex,
        `$1$2\n        // Manifest placeholders for react-native-app-auth\n        manifestPlaceholders = [\n            appAuthRedirectScheme: 'trave-social'\n        ]\n`
      );
      
      modResults.contents = buildGradle;
      console.log('✅ Added manifestPlaceholders to build.gradle');
    } else {
      console.warn('⚠️ Could not find defaultConfig block in build.gradle');
    }

    return config;
  });
};

module.exports = withAppAuthRedirectScheme;

