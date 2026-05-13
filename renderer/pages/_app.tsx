import "../styles/globals.css";
import Head from "next/head";
import { AppProps } from "next/app";
import { Provider } from "jotai";
import "react-tooltip/dist/react-tooltip.css";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip } from "react-tooltip";
import PostHogProviderWrapper from "@/components/posthog-provider-wrapper";

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

      <Provider>
        <PostHogProviderWrapper>
          <Component {...pageProps} data-theme="symp" />
          <Toaster />
          <Tooltip
            className="z-[999] max-w-sm break-words !bg-secondary"
            id="tooltip"
          />
        </PostHogProviderWrapper>
      </Provider>
    </>
  );
};

export default MyApp;
