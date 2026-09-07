import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Baked into the app's package name — changing this later makes Android
  // treat it as a different app entirely (separate install, no in-place
  // update), so it's worth getting right before the first real build
  // rather than after.
  appId: 'com.executeit.pos',
  appName: 'Execute IT POS',
  webDir: 'dist',
  server: {
    // Points the native shell straight at the live Vite dev server rather
    // than a bundled build — every code change hot-reloads exactly like it
    // does in a browser tab today, no APK rebuild/reinstall needed for
    // ordinary frontend work. Only touching this file, the app icon, or
    // native permissions requires rebuilding through Android Studio/Gradle
    // again. Swap this to a real backend URL (and drop `server` entirely,
    // relying on the bundled `webDir` build) once this moves off a dev
    // machine and onto something meant to stay running.
    url: 'http://192.168.100.59:5173',
    // Plain HTTP, deliberately. A native WebView doesn't check
    // "installability" or certificate trust the way Chrome's Add to Home
    // Screen did — the app is already really installed the moment the
    // APK is on the device — so this sidesteps the mkcert/CA-trust setup
    // entirely for this path. cleartext:true is required for it: Android
    // 9+ blocks plain HTTP by default, and this tells the generated
    // native project to allow it.
    cleartext: true,
  },
};

export default config;
