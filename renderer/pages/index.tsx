"use client";
import { useState, useEffect, useRef } from "react";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { customModelIdsAtom } from "../atoms/models-list-atom";
import {
  batchModeAtom,
  savedOutputPathAtom,
  progressAtom,
  rememberOutputFolderAtom,
  userStatsAtom,
  compressionAtom,
  gpuIdAtom,
  saveImageAsAtom,
} from "../atoms/user-settings-atom";
import useLogger from "../components/hooks/use-logger";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { translationAtom } from "@/atoms/translations-atom";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import LeftPanel from "@/components/left-panel";
import PreviewPanel from "@/components/preview-panel";
import SettingsTab from "@/components/sidebar/settings-tab";
import getDirectoryFromPath from "@common/get-directory-from-path";
import { FEATURE_FLAGS } from "@common/feature-flags";
import { ImageFormat, VALID_IMAGE_FORMATS } from "@/lib/valid-formats";
import { initCustomModels } from "@/components/hooks/use-custom-models";
import useSystemInfo from "@/components/hooks/use-system-info";
import { logAtom } from "@/atoms/log-atom";

const Home = () => {
  const t = useAtomValue(translationAtom);
  const logit = useLogger();
  const { toast } = useToast();
  const { systemInfo } = useSystemInfo();

  initCustomModels();

  const [isLoading, setIsLoading] = useState(true);
  const [imagePath, setImagePath] = useState("");
  const [upscaledImagePath, setUpscaledImagePath] = useState("");
  const [dimensions, setDimensions] = useState({
    width: null,
    height: null,
  });
  const setOutputPath = useSetAtom(savedOutputPathAtom);
  const rememberOutputFolder = useAtomValue(rememberOutputFolderAtom);
  const batchMode = useAtomValue(batchModeAtom);
  const [batchFolderPath, setBatchFolderPath] = useState("");
  const [upscaledBatchFolderPath, setUpscaledBatchFolderPath] = useState("");
  const setProgress = useSetAtom(progressAtom);
  const [doubleUpscaylCounter, setDoubleUpscaylCounter] = useState(0);
  const setModelIds = useSetAtom(customModelIdsAtom);
  const setUserStats = useSetAtom(userStatsAtom);

  const [selectedTab, setSelectedTab] = useState(0);
  const upscaylHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const handleUpscaylHandlerReady = (handler: () => Promise<void>) => {
    upscaylHandlerRef.current = handler;
  };
  const upscaylHandler = () => upscaylHandlerRef.current?.();

  // UI redesign state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [zoomAmount, setZoomAmount] = useState("100");
  const [dragActive, setDragActive] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // DRAG AND DROP HANDLERS
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    resetImagePaths();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      toast({
        title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.INVALID_IMAGE_ERROR.ADDITIONAL_DESCRIPTION"),
      });
      return;
    }

    const file = files[0];
    // Use Electron 32+ webUtils.getPathForFile (exposed via preload), fallback to legacy .path
    let filePath = "";
    try {
      filePath = (window as any).electron?.getPathForFile?.(file) || (file as any).path || "";
    } catch {
      filePath = (file as any).path || "";
    }
    const extension = (filePath.split(/[\\/]/).pop()?.split(".").pop() || file.name.split(".").pop() || "").toLowerCase() as ImageFormat;

    if (!filePath) {
      toast({
        title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.INVALID_IMAGE_ERROR.ADDITIONAL_DESCRIPTION"),
      });
      return;
    }

    if (!VALID_IMAGE_FORMATS.includes(extension)) {
      toast({
        title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
        description: t("ERRORS.INVALID_IMAGE_ERROR.ADDITIONAL_DESCRIPTION"),
      });
      return;
    }

    logit("🖼 Drop: setting image path: ", filePath);
    setImagePath(filePath);
    if (!FEATURE_FLAGS.APP_STORE_BUILD && !rememberOutputFolder) {
      setOutputPath(getDirectoryFromPath(filePath));
    }
    validateImagePath(filePath);
  };

  const [compression, setCompression] = useAtom(compressionAtom);
  const [gpuId, setGpuId] = useAtom(gpuIdAtom);
  const [saveImageAs, setSaveImageAs] = useAtom(saveImageAsAtom);
  const logData = useAtomValue(logAtom);

  const selectImageHandler = async () => {
    resetImagePaths();
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FILE);
    if (path === null) return;
    logit("🖼 Selected Image Path: ", path);
    setImagePath(path);
    const dirname = getDirectoryFromPath(path);
    logit("📁 Selected Image Directory: ", dirname);
    if (!FEATURE_FLAGS.APP_STORE_BUILD) {
      if (!rememberOutputFolder) {
        setOutputPath(dirname);
      }
    }
    validateImagePath(path);
  };

  const selectFolderHandler = async () => {
    resetImagePaths();
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FOLDER);
    if (path !== null) {
      logit("🖼 Selected Folder Path: ", path);
      setBatchFolderPath(path);
      if (!rememberOutputFolder) {
        setOutputPath(path);
      }
    } else {
      logit("🚫 Folder selection cancelled");
      setBatchFolderPath("");
      if (!rememberOutputFolder) {
        setOutputPath("");
      }
    }
  };

  const validateImagePath = (path: string) => {
    if (path.length > 0) {
      logit("🖼 imagePath: ", path);
      const extension = path.split(".").pop().toLowerCase() as ImageFormat;
      logit("🔤 Extension: ", extension);
      if (!VALID_IMAGE_FORMATS.includes(extension)) {
        toast({
          title: t("ERRORS.INVALID_IMAGE_ERROR.TITLE"),
          description: t("ERRORS.INVALID_IMAGE_ERROR.DESCRIPTION"),
        });
        resetImagePaths();
      }
    } else {
      resetImagePaths();
    }
  };

  // ELECTRON EVENT LISTENERS
  useEffect(() => {
    const handleErrors = (data: string) => {
      if (data.includes("Invalid GPU")) {
        toast({
          title: t("ERRORS.GPU_ERROR.TITLE"),
          description: t("ERRORS.GPU_ERROR.DESCRIPTION", { data }),
          action: (
            <div className="flex flex-col gap-2">
              <ToastAction
                altText={t("ERRORS.COPY_ERROR.TITLE")}
                onClick={() => {
                  navigator.clipboard.writeText(data);
                }}
              >
                {t("ERRORS.COPY_ERROR.TITLE")}
              </ToastAction>
              <a href="https://docs.upscayl.org/" target="_blank">
                <ToastAction altText={t("ERRORS.OPEN_DOCS_TITLE")}>
                  {t("ERRORS.OPEN_DOCS_BUTTON_TITLE")}
                </ToastAction>
              </a>
            </div>
          ),
        });
        resetImagePaths();
      } else if (data.includes("write") || data.includes("read")) {
        if (batchMode) return;
        toast({
          title: t("ERRORS.READ_WRITE_ERROR.TITLE"),
          description: t("ERRORS.READ_WRITE_ERROR.DESCRIPTION", { data }),
          action: (
            <div className="flex flex-col gap-2">
              <ToastAction
                altText="Copy Error"
                onClick={() => {
                  navigator.clipboard.writeText(data);
                }}
              >
                {t("ERRORS.COPY_ERROR.TITLE")}
              </ToastAction>
              <a href="https://docs.upscayl.org/" target="_blank">
                <ToastAction altText={t("ERRORS.OPEN_DOCS_TITLE")}>
                  {t("ERRORS.OPEN_DOCS_BUTTON_TITLE")}
                </ToastAction>
              </a>
            </div>
          ),
        });
        resetImagePaths();
      } else if (data.includes("tile size")) {
        toast({
          title: t("ERRORS.TILE_SIZE_ERROR.TITLE"),
          description: t("ERRORS.TILE_SIZE_ERROR.DESCRIPTION", { data }),
        });
        resetImagePaths();
      } else if (data.includes("uncaughtException")) {
        toast({
          title: t("ERRORS.EXCEPTION_ERROR.TITLE"),
          description: t("ERRORS.EXCEPTION_ERROR.DESCRIPTION"),
        });
        resetImagePaths();
      }
    };
    // LOG
    window.electron.on(ELECTRON_COMMANDS.LOG, (_, data: string) => {
      logit(`🎒 BACKEND REPORTED: `, data);
    });
    // SCALING AND CONVERTING
    window.electron.on(
      ELECTRON_COMMANDS.SCALING_AND_CONVERTING,
      (_, data: string) => {
        setProgress(t("APP.PROGRESS.PROCESSING_TITLE"));
      },
    );
    // UPSCAYL WARNING
    window.electron.on(ELECTRON_COMMANDS.UPSCAYL_WARNING, (_, data: string) => {
      toast({
        title: t("WARNING.GENERIC_WARNING.TITLE"),
        description: data,
      });
    });
    // METADATA ERROR
    window.electron.on(ELECTRON_COMMANDS.METADATA_ERROR, (_, data: string) => {
      toast({
        title: t("ERRORS.METADATA_ERROR.TITLE"),
        description: data,
      });
    });
    // UPSCAYL ERROR
    window.electron.on(ELECTRON_COMMANDS.UPSCAYL_ERROR, (_, data: string) => {
      toast({
        title: t("ERRORS.GENERIC_ERROR.TITLE"),
        description: data,
      });
      resetImagePaths();
    });
    // UPSCAYL PROGRESS
    window.electron.on(
      ELECTRON_COMMANDS.UPSCAYL_PROGRESS,
      (_, data: string) => {
        const percentMatch = data.match(/\d+(?:\.\d+)?%/);
        if (percentMatch) {
          setProgress(percentMatch[0]);
        } else if (data.includes("converting")) {
          setProgress(t("APP.PROGRESS.SCALING_CONVERTING_TITLE"));
        } else if (data.includes("Successful")) {
          setProgress(t("APP.PROGRESS.SUCCESS_TITLE"));
        }
        handleErrors(data);
        logit(`🚧 PROGRESS: `, data);
      },
    );
    // FOLDER UPSCAYL PROGRESS
    window.electron.on(
      ELECTRON_COMMANDS.FOLDER_UPSCAYL_PROGRESS,
      (_, data: string) => {
        const percentMatch = data.match(/\d+(?:\.\d+)?%/);
        if (data.includes("Successful")) {
          setProgress(t("APP.PROGRESS.SUCCESS_TITLE"));
        } else if (percentMatch) {
          setProgress(percentMatch[0]);
        }
        handleErrors(data);
        logit(`🚧 PROGRESS: `, data);
      },
    );
    // DOUBLE UPSCAYL PROGRESS
    window.electron.on(
      ELECTRON_COMMANDS.DOUBLE_UPSCAYL_PROGRESS,
      (_, data: string) => {
        const percentMatch = data.match(/\d+(?:\.\d+)?%/);
        if (percentMatch) {
          if (percentMatch[0] === "0.00%") {
            setDoubleUpscaylCounter(doubleUpscaylCounter + 1);
          }
          setProgress(percentMatch[0]);
        }
        handleErrors(data);
        logit(`🚧 PROGRESS: `, data);
      },
    );
    // UPSCAYL DONE
    window.electron.on(ELECTRON_COMMANDS.UPSCAYL_DONE, (_, data: string) => {
      setProgress("");
      setUpscaledImagePath(data);
      setUserStats((prev) => ({
        ...prev,
        lastUpscaylDuration: new Date().getTime() - prev.lastUsedAt,
        averageUpscaylTime:
          (prev.averageUpscaylTime * prev.totalUpscayls +
            (new Date().getTime() - prev.lastUsedAt)) /
          (prev.totalUpscayls + 1),
      }));
      logit("upscaledImagePath: ", data);
      logit(`💯 UPSCAYL_DONE: `, data);
    });
    // FOLDER UPSCAYL DONE
    window.electron.on(
      ELECTRON_COMMANDS.FOLDER_UPSCAYL_DONE,
      (_, data: string) => {
        setProgress("");
        setUpscaledBatchFolderPath(data);
        logit(`💯 DONE: `, data);
        setUserStats((prev) => ({
          ...prev,
          lastUpscaylDuration: new Date().getTime() - prev.lastUsedAt,
          averageUpscaylTime:
            (prev.averageUpscaylTime * prev.totalUpscayls +
              (new Date().getTime() - prev.lastUsedAt)) /
            (prev.totalUpscayls + 1),
        }));
      },
    );
    // DOUBLE UPSCAYL DONE
    window.electron.on(
      ELECTRON_COMMANDS.DOUBLE_UPSCAYL_DONE,
      (_, data: string) => {
        setProgress("");
        setTimeout(() => setUpscaledImagePath(data), 500);
        setDoubleUpscaylCounter(0);
        logit(`💯 DOUBLE_UPSCAYL_DONE: `, data);
        setUserStats((prev) => ({
          ...prev,
          lastUpscaylDuration: new Date().getTime() - prev.lastUsedAt,
          averageUpscaylTime:
            (prev.averageUpscaylTime * prev.totalUpscayls +
              (new Date().getTime() - prev.lastUsedAt)) /
            (prev.totalUpscayls + 1),
        }));
      },
    );
    // CUSTOM FOLDER LISTENER
    window.electron.on(
      ELECTRON_COMMANDS.CUSTOM_MODEL_FILES_LIST,
      (_, data: string[]) => {
        logit(`📜 CUSTOM_MODEL_FILES_LIST: `, data);
        console.log("🚀 => data:", data);
        setModelIds(data);
      },
    );
  }, []);

  // LOADING STATE
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // SYSTEM INFO
  useEffect(() => {
    if (systemInfo) logit("💻 System Info:", JSON.stringify(systemInfo));
  }, [systemInfo]);

  // HANDLERS
  const resetImagePaths = () => {
    logit("🔄 Resetting image paths");
    setDimensions({
      width: null,
      height: null,
    });
    setProgress("");
    setImagePath("");
    setUpscaledImagePath("");
    setBatchFolderPath("");
    setUpscaledBatchFolderPath("");
  };

  if (isLoading) {
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#0E0E0F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "symp-pulse 1.2s ease-in-out infinite",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 22,
              background: "#0055A4",
              transform: "skewX(-15deg)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--symp-font, Geist, -apple-system, sans-serif)",
      }}
      onPaste={(e) => console.log(e)}
    >
      {/* Hidden Sidebar: provides upscaylHandler IPC wiring */}
      <div style={{ display: "none" }}>
        <Sidebar
          imagePath={imagePath}
          dimensions={dimensions}
          setUpscaledImagePath={setUpscaledImagePath}
          batchFolderPath={batchFolderPath}
          setUpscaledBatchFolderPath={setUpscaledBatchFolderPath}
          selectImageHandler={selectImageHandler}
          selectFolderHandler={selectFolderHandler}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          onUpscaylHandlerReady={handleUpscaylHandlerReady}
        />
      </div>

      <TopBar
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        theme={theme}
        setTheme={setTheme}
        zoomAmount={zoomAmount}
        setZoomAmount={setZoomAmount}
        showComparison={showComparison}
        setShowComparison={setShowComparison}
      />

      {selectedTab === 1 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          <SettingsTab
            batchMode={batchMode}
            saveImageAs={saveImageAs}
            setSaveImageAs={setSaveImageAs}
            compression={compression}
            setCompression={setCompression}
            gpuId={gpuId}
            setGpuId={setGpuId}
            logData={logData}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden" }}>
          <LeftPanel
            imagePath={imagePath}
            batchFolderPath={batchFolderPath}
            dimensions={dimensions}
            selectImageHandler={selectImageHandler}
            selectFolderHandler={selectFolderHandler}
            resetImagePaths={resetImagePaths}
            validateImagePath={validateImagePath}
            setImagePath={setImagePath}
            upscaylHandler={upscaylHandler}
            dragActive={dragActive}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          />
          <PreviewPanel
            imagePath={imagePath}
            upscaledImagePath={upscaledImagePath}
            dimensions={dimensions}
            doubleUpscaylCounter={doubleUpscaylCounter}
            setDimensions={setDimensions}
            zoomAmount={zoomAmount}
            showComparison={showComparison}
          />
        </div>
      )}

    </div>
  );
};

export default Home;
