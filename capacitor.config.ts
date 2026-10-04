import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.melachow.vendor',
  appName: 'MelaChow Vendor',
  webDir: '.native-build/out',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#ffffff',
      style: 'DARK'
    }
  }
};

export default config;
