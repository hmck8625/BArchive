import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.HMCK.MemoryAIApp',
  appName: 'MemoryAI',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    url: 'https://b-archive.vercel.app/',
    cleartext: true
  }
};

export default config;
