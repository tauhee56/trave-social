import { authorize } from 'react-native-app-auth';
// @ts-ignore
import { tiktokConfig } from '../../legacy_config/tiktokAuth';
let SnapKit: any = null;
try {
  SnapKit = require('react-native-snapkit');
} catch (e) {
  SnapKit = null;
}

async function signInWithTikTok(): Promise<any> {
  try {
    const result = await authorize(tiktokConfig);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error };
  }
}

export default signInWithTikTok;
