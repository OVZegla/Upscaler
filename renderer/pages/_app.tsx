import "../styles/globals.css";
import Head from "next/head";
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
    <>
      <Head>
        <title>Symp&apos;s Upscale</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <base href="./" />

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
    </>
  );
};

export default MyApp;
