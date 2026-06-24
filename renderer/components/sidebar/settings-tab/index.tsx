import { SaveOutputFolderToggle } from "./save-output-folder-toggle";
import { InputGpuId } from "./input-gpu-id";
import { CustomModelsFolderSelect } from "./select-custom-models-folder";
import { LogArea } from "./log-area";
import { SelectImageScale } from "./select-image-scale";
import { SelectImageFormat } from "./select-image-format";
import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { customModelsPathAtom, scaleAtom } from "@/atoms/user-settings-atom";
import { InputCompression } from "./input-compression";
import OverwriteToggle from "./overwrite-toggle";
import { ResetSettingsButton } from "./reset-settings-button";
import { FEATURE_FLAGS } from "@common/feature-flags";
import TurnOffNotificationsToggle from "./turn-off-notifications-toggle";
import { cn } from "@/lib/utils";
import { InputCustomResolution } from "./input-custom-resolution";
import { InputTileSize } from "./input-tile-size";
import LanguageSwitcher from "./language-switcher";
import { translationAtom } from "@/atoms/translations-atom";
import { ImageFormat } from "@/lib/valid-formats";
import EnableContributionToggle from "./enable-contributions-toggle";
import AutoUpdateToggle from "./auto-update-toggle";
import TTAModeToggle from "./tta-mode-toggle";
import SystemInfo from "./system-info";
import CopyMetadataToggle from "./copy-metadata-toggle";

interface IProps {
  batchMode: boolean;
  saveImageAs: ImageFormat;
  setSaveImageAs: React.Dispatch<React.SetStateAction<ImageFormat>>;
  compression: number;
  setCompression: React.Dispatch<React.SetStateAction<number>>;
  gpuId: string;
  setGpuId: React.Dispatch<React.SetStateAction<string>>;
  logData: string[];
}

function SettingsTab({
  batchMode,
  compression,
  setCompression,
  gpuId,
  setGpuId,
  saveImageAs,
  setSaveImageAs,
  logData,
}: IProps) {
  const [isCopied, setIsCopied] = useState(false);

  const [customModelsPath, setCustomModelsPath] = useAtom(customModelsPathAtom);
  const [scale, setScale] = useAtom(scaleAtom);
  const [enableScrollbar, setEnableScrollbar] = useState(true);
  const [timeoutId, setTimeoutId] = useState(null);
  const t = useAtomValue(translationAtom);

  // HANDLERS
  const setExportType = (format: ImageFormat) => {
    setSaveImageAs(format);
  };

  const handleCompressionChange = (e) => {
    setCompression(e.target.value);
  };

  const handleGpuIdChange = (e) => {
    setGpuId(e.target.value);
    localStorage.setItem("gpuId", e.target.value);
  };

  const copyOnClickHandler = () => {
    navigator.clipboard.writeText(logData.join("\n"));
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const sendToTermbin = async (logData: string[]) => {
    try {
      const response = await fetch("https://termbin.com:9999/", {
        method: "POST",
        body: logData.join("\n"),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const url = await response.text();
      return url.trim();
    } catch (error) {
      console.error("Error sending to termbin:", error);
      throw error;
    }
  };

  const upscaylVersion = navigator?.userAgent?.match(
    /(?:Upscayl|Symps?[\s-]?Upscale)\/([\d.]+)/i,
  )?.[1] ?? "";

  function disableScrolling() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    setTimeoutId(
      setTimeout(function () {
        setEnableScrollbar(false);
      }, 1000),
    );
  }

  function enableScrolling() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    setEnableScrollbar(true);
  }

  return (
    <div
      className={cn(
        "animate-step-in animate z-50 flex h-screen flex-col gap-7 overflow-y-auto overflow-x-hidden p-5",
        enableScrollbar ? "" : "hide-scrollbar",
      )}
      onScroll={() => {
        if (enableScrollbar) disableScrolling();
      }}
      onWheel={() => {
        enableScrolling();
      }}
    >
      <details>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--symp-ink-3)", userSelect: "none" }}>
          Logs
        </summary>
        <LogArea
          copyOnClickHandler={copyOnClickHandler}
          isCopied={isCopied}
          logData={logData}
        />
      </details>


      <LanguageSwitcher />

      {/* IMAGE FORMAT BUTTONS */}
      <SelectImageFormat
        batchMode={batchMode}
        saveImageAs={saveImageAs}
        setExportType={setExportType}
      />
      
      {/* COPY METADATA TOGGLE */}
      <CopyMetadataToggle saveImageAs={saveImageAs} setExportType={setExportType} />

      {/* IMAGE SCALE */}
      <SelectImageScale scale={scale} setScale={setScale} />

      <InputCustomResolution />

      <InputCompression
        compression={compression}
        handleCompressionChange={handleCompressionChange}
      />

      <SaveOutputFolderToggle />

      <OverwriteToggle />
      <TurnOffNotificationsToggle />
      <AutoUpdateToggle />
      <EnableContributionToggle />

      {/* GPU ID INPUT */}
      <InputGpuId gpuId={gpuId} handleGpuIdChange={handleGpuIdChange} />

      <InputTileSize />

      {/* CUSTOM MODEL */}
      <CustomModelsFolderSelect
        customModelsPath={customModelsPath}
        setCustomModelsPath={setCustomModelsPath}
      />

      <TTAModeToggle />

      {/* RESET SETTINGS */}
      <ResetSettingsButton />

      <SystemInfo />

      <div style={{ marginTop: "auto", paddingTop: 32, fontSize: 11, color: "var(--symp-ink-3)", lineHeight: 1.7, opacity: 0.7 }}>
        <div>Basé sur <strong>Upscayl</strong> — licence GNU AGPL-3.0.</div>
        <div>Code source disponible sur GitHub.</div>
        <div>Aucun lien officiel avec le projet Upscayl.</div>
        <div>Le support Symp's ne s'applique qu'aux builds officiels Symp's.</div>
      </div>
    </div>
  );
}

export default SettingsTab;
