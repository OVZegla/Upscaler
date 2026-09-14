"use client";
import { useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { cmToPixels } from "@/lib/print-size";
import {
  batchModeAtom,
  compressionAtom,
  dontShowCloudModalAtom,
  noImageProcessingAtom,
  savedOutputPathAtom,
  overwriteAtom,
  progressAtom,
  scaleAtom,
  customWidthAtom,
  useCustomWidthAtom,
  tileSizeAtom,
  selectedModelIdAtom,
  doubleUpscaylAtom,
  gpuIdAtom,
  saveImageAsAtom,
  userStatsAtom,
  ttaModeAtom,
  copyMetadataAtom,
  usePrintSizeAtom,
  printDpiAtom,
  printWidthCmAtom,
} from "../../atoms/user-settings-atom";
import useLogger from "../hooks/use-logger";
import {
  BatchUpscaylPayload,
  DoubleUpscaylPayload,
  ImageUpscaylPayload,
} from "@common/types/types";
import { useToast } from "@/components/ui/use-toast";
import { logAtom } from "@/atoms/log-atom";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import useUpscaylVersion from "../hooks/use-upscayl-version";
import useTranslation from "../hooks/use-translation";
import LeftNav from "../left-nav";

const Sidebar = ({
  setUpscaledImagePath,
  batchFolderPath,
  setUpscaledBatchFolderPath,
  dimensions,
  imagePath,
  selectImageHandler,
  selectFolderHandler,
  selectedTab,
  setSelectedTab,
  onUpscaylHandlerReady,
}: {
  setUpscaledImagePath: React.Dispatch<React.SetStateAction<string>>;
  batchFolderPath: string;
  setUpscaledBatchFolderPath: React.Dispatch<React.SetStateAction<string>>;
  dimensions: {
    width: number | null;
    height: number | null;
  };
  imagePath: string;
  selectImageHandler: () => Promise<void>;
  selectFolderHandler: () => Promise<void>;
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
  onUpscaylHandlerReady: (handler: () => Promise<void>) => void;
}) => {
  const t = useTranslation();
  const logit = useLogger();
  const { toast } = useToast();
  const version = useUpscaylVersion();

  const [selectedModelId] = useAtom(selectedModelIdAtom);
  const [doubleUpscayl, setDoubleUpscayl] = useAtom(doubleUpscaylAtom);
  const [gpuId] = useAtom(gpuIdAtom);
  const [saveImageAs] = useAtom(saveImageAsAtom);

  const overwrite = useAtomValue(overwriteAtom);
  const outputPath = useAtomValue(savedOutputPathAtom);
  const [compression] = useAtom(compressionAtom);
  const setProgress = useSetAtom(progressAtom);
  const [batchMode, setBatchMode] = useAtom(batchModeAtom);
  const [scale] = useAtom(scaleAtom);
  const setDontShowCloudModal = useSetAtom(dontShowCloudModalAtom);
  const noImageProcessing = useAtomValue(noImageProcessingAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);
  const tileSize = useAtomValue(tileSizeAtom);
  const setUserStats = useSetAtom(userStatsAtom);
  const ttaMode = useAtomValue(ttaModeAtom);
  const [copyMetadata] = useAtom(copyMetadataAtom);
  const usePrintSize = useAtomValue(usePrintSizeAtom);
  const printDpi = useAtomValue(printDpiAtom);
  const printWidthCm = useAtomValue(printWidthCmAtom);
  // Only stamp a resolution when the user sized the job in real-world units.
  const outputDpi = usePrintSize ? printDpi : null;

  // Print mode derives the pixel width here rather than writing into
  // customWidthAtom, which belongs to the "custom resolution" setting —
  // sharing it would clobber whatever the user set there.
  const printWidthPx = usePrintSize ? cmToPixels(printWidthCm, printDpi) : 0;
  const effectiveUseCustomWidth = usePrintSize ? true : useCustomWidth;
  const effectiveCustomWidth = usePrintSize
    ? printWidthPx > 0
      ? printWidthPx.toString()
      : null
    : customWidth > 0
      ? customWidth.toString()
      : null;

  const upscaylHandler = async () => {
    logit("🔄 Resetting Upscaled Image Path");
    setUpscaledImagePath("");
    setUpscaledBatchFolderPath("");
    if (imagePath !== "" || batchFolderPath !== "") {
      setProgress(t("APP.PROGRESS.WAIT_TITLE"));
      if (doubleUpscayl) {
        window.electron.send<DoubleUpscaylPayload>(
          ELECTRON_COMMANDS.DOUBLE_UPSCAYL,
          {
            imagePath,
            outputPath,
            model: selectedModelId,
            gpuId: gpuId.length === 0 ? null : gpuId,
            saveImageAs,
            scale,
            noImageProcessing,
            compression: compression.toString(),
            customWidth: effectiveCustomWidth,
            useCustomWidth: effectiveUseCustomWidth,
            tileSize,
            ttaMode,
            copyMetadata,
            outputDpi,
          },
        );
        setUserStats((prev) => ({
          ...prev,
          totalUpscayls: prev.totalUpscayls + 1,
          lastUsedAt: new Date().getTime(),
          doubleUpscayls: prev.doubleUpscayls + 1,
          imageUpscayls: prev.imageUpscayls + 1,
        }));
        logit("🏁 DOUBLE_UPSCAYL");
      } else if (batchMode) {
        setDoubleUpscayl(false);
        window.electron.send<BatchUpscaylPayload>(
          ELECTRON_COMMANDS.FOLDER_UPSCAYL,
          {
            batchFolderPath,
            outputPath,
            model: selectedModelId,
            gpuId: gpuId.length === 0 ? null : gpuId,
            saveImageAs,
            scale,
            noImageProcessing,
            compression: compression.toString(),
            customWidth: effectiveCustomWidth,
            useCustomWidth: effectiveUseCustomWidth,
            tileSize,
            ttaMode,
            copyMetadata,
            outputDpi,
          },
        );
        setUserStats((prev) => ({
          ...prev,
          totalUpscayls: prev.totalUpscayls + 1,
          lastUsedAt: new Date().getTime(),
          batchUpscayls: prev.doubleUpscayls + 1,
        }));
        logit("🏁 FOLDER_UPSCAYL");
      } else {
        window.electron.send<ImageUpscaylPayload>(ELECTRON_COMMANDS.UPSCAYL, {
          imagePath,
          outputPath,
          model: selectedModelId,
          gpuId: gpuId.length === 0 ? null : gpuId,
          saveImageAs,
          scale,
          overwrite,
          noImageProcessing,
          compression: compression.toString(),
          customWidth: effectiveCustomWidth,
          useCustomWidth: effectiveUseCustomWidth,
          tileSize,
          ttaMode,
          copyMetadata,
          outputDpi,
        });
        setUserStats((prev) => ({
          ...prev,
          totalUpscayls: prev.totalUpscayls + 1,
          lastUsedAt: new Date().getTime(),
          imageUpscayls: prev.imageUpscayls + 1,
        }));
        logit("🏁 UPSCAYL");
      }
    } else {
      toast({
        title: t("ERRORS.NO_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.NO_IMAGE_ERROR.DESCRIPTION"),
      });
      logit("🚫 No valid image selected");
    }
  };

  useEffect(() => {
    onUpscaylHandlerReady(upscaylHandler);
    // Print-mode values belong here too: without them the registered handler
    // keeps a stale width/DPI and the job runs with the previous size.
  }, [imagePath, batchFolderPath, outputPath, selectedModelId, doubleUpscayl, batchMode, scale, gpuId, saveImageAs, noImageProcessing, compression, customWidth, useCustomWidth, tileSize, ttaMode, copyMetadata, overwrite, usePrintSize, printDpi, printWidthCm]);

  return (
    <LeftNav
      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}
      version={version}
    />
  );
};

export default Sidebar;
