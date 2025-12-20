import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase
jest.mock('./config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSegments: jest.fn(() => []),
  Stack: { Screen: 'Screen' },
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri) => Promise.resolve({ uri: 'optimized-' + uri })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 * 1024 })),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Silence console warnings during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};
