import "../styles/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";

// Loaded at build time — no network request at runtime (works offline).
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
import { AppProps } from "next/app";
import { Provider } from "jotai";
import "react-tooltip/dist/react-tooltip.css";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip } from "react-tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { installTauriElectronShim } from "@/lib/tauri-electron-shim";
import { installGlobalErrorOverlay } from "@/lib/global-error-overlay";

// Make any uncaught error visible instead of a silent black screen. Must run
// first so it can also catch failures from the shim installation below.
installGlobalErrorOverlay();

// Install the window.electron compatibility shim as early as possible when
// running under Tauri (no-op under Electron or during static export build).
// Never let a shim failure abort module evaluation (would black-screen the app).
try {
  installTauriElectronShim();
} catch (err) {
  console.error("[_app] installTauriElectronShim threw:", err);
}

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <div className={`${geist.variable} ${geistMono.variable}`}>
      <Head>
        <title>Symp&apos;s Upscale</title>
      </Head>

      <ErrorBoundary>
        <Provider>
          <Component {...pageProps} data-theme="symp" />
          <Toaster />
          <Tooltip
            className="z-[999] max-w-sm break-words !bg-secondary"
            id="tooltip"
          />
        </Provider>
      </ErrorBoundary>
    </div>
  );
};

export default MyApp;
