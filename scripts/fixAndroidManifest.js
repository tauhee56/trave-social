const fs = require('fs');
const path = require('path');

const manifests = [
  'node_modules/react-native-app-auth/android/src/main/AndroidManifest.xml',
  'node_modules/@react-native-community/netinfo/android/src/main/AndroidManifest.xml',
  'node_modules/@react-native-google-signin/google-signin/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml',
];

manifests.forEach((manifest) => {
  const filePath = path.join(__dirname, '..', manifest);
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      // Remove package attribute from manifest tag
      content = content.replace(/\spackage="[^"]*"/, '');
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed: ${manifest}`);
      }
    } catch (error) {
      console.error(`✗ Error fixing ${manifest}:`, error.message);
    }
  }
});
