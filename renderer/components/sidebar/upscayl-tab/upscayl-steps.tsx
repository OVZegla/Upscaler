import { useAtom, useAtomValue } from "jotai";
import React, { useEffect, useMemo } from "react";
import useLogger from "../../hooks/use-logger";
import {
  savedOutputPathAtom,
  progressAtom,
  rememberOutputFolderAtom,
  scaleAtom,
  customWidthAtom,
  useCustomWidthAtom,
} from "../../../atoms/user-settings-atom";
import { FEATURE_FLAGS } from "@common/feature-flags";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { useToast } from "@/components/ui/use-toast";
import { translationAtom } from "@/atoms/translations-atom";
import { SelectImageScale } from "../settings-tab/select-image-scale";
import SelectModelDialog from "./select-model-dialog";
import { ImageFormat } from "@/lib/valid-formats";

interface IProps {
  selectImageHandler: () => Promise<void>;
  selectFolderHandler: () => Promise<void>;
  upscaylHandler: () => Promise<void>;
  batchMode: boolean;
  setBatchMode: React.Dispatch<React.SetStateAction<boolean>>;
  imagePath: string;
  doubleUpscayl: boolean;
  setDoubleUpscayl: React.Dispatch<React.SetStateAction<boolean>>;
  dimensions: {
    width: number | null;
    height: number | null;
  };
  setSaveImageAs: React.Dispatch<React.SetStateAction<ImageFormat>>;
  setGpuId: React.Dispatch<React.SetStateAction<string>>;
}

// ── Small icons ──────────────────────────────────────────────────────
const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

const ImageIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5.5-5.5L7 19" />
  </svg>
);

const FolderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V6.5Z" />
  </svg>
);

// ── Step heading chip ─────────────────────────────────────────────────
function StepChip({
  n,
  done,
  active,
}: {
  n: number;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--symp-mono, monospace)",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
        background: done
          ? "var(--symp-accent, #0055A4)"
          : active
          ? "var(--symp-ink, #0E0E0F)"
          : "var(--symp-bg-2, #F2F0EC)",
        color: done
          ? "#fff"
          : active
          ? "var(--symp-ink-inv, #FFFFFF)"
          : "var(--symp-ink-3, #6F6F75)",
        border:
          done || active
            ? "0"
            : "1px solid var(--symp-line, rgba(14,14,15,0.08))",
        transition: "all 0.25s ease",
      }}
    >
      {done ? <CheckIcon /> : String(n).padStart(2, "0")}
    </div>
  );
}

function StepHeading({
  n,
  title,
  hint,
  done,
  active,
}: {
  n: number;
  title: string;
  hint?: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <StepChip n={n} done={done} active={active} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--symp-ink, #0E0E0F)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--symp-ink-3, #6F6F75)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Primary button ─────────────────────────────────────────────────────
function PrimaryBtn({
  onClick,
  children,
  leading,
  disabled,
  big,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
  disabled?: boolean;
  big?: boolean;
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      disabled={disabled}
      style={{
        appearance: "none",
        border: 0,
        width: "100%",
        background: disabled
          ? "var(--symp-bg-2, #F2F0EC)"
          : "var(--symp-ink, #0E0E0F)",
        color: disabled
          ? "var(--symp-ink-3, #6F6F75)"
          : "var(--symp-ink-inv, #FFFFFF)",
        fontFamily: "var(--symp-font, Geist, sans-serif)",
        fontWeight: 600,
        fontSize: big ? 14 : 13,
        letterSpacing: "-0.005em",
        padding: big ? "14px 18px" : "10px 14px",
        borderRadius: "var(--symp-radius-btn, 10px)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : press
          ? "inset 0 2px 4px rgba(0,0,0,0.25)"
          : hover
          ? "0 4px 14px rgba(14,14,15,0.25)"
          : "0 1px 2px rgba(14,14,15,0.15)",
        transform: press ? "translateY(1px)" : "translateY(0)",
        transition:
          "transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {leading && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {leading}
        </span>
      )}
      <span style={{ whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
        {children}
      </span>
      <span style={{ opacity: 0.6, flexShrink: 0 }}>
        <ArrowIcon />
      </span>
    </button>
  );
}

function GhostBtn({
  onClick,
  children,
  leading,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        appearance: "none",
        width: "100%",
        border: "1px solid var(--symp-line-2, rgba(14,14,15,0.14))",
        background: hover
          ? "var(--symp-bg-2, #F2F0EC)"
          : "var(--symp-panel, #FFFFFF)",
        color: "var(--symp-ink, #0E0E0F)",
        fontFamily: "var(--symp-font, Geist, sans-serif)",
        fontWeight: 500,
        fontSize: 13,
        padding: "10px 14px",
        borderRadius: "var(--symp-radius-btn, 10px)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {leading && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: "var(--symp-ink-2, #3A3A3D)",
            flexShrink: 0,
          }}
        >
          {leading}
        </span>
      )}
      <span style={{ whiteSpace: "nowrap" }}>{children}</span>
    </button>
  );
}

// ── Mini toggle ───────────────────────────────────────────────────────
function MiniToggle({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
    >
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          position: "relative",
          width: 34,
          height: 20,
          borderRadius: 999,
          border: 0,
          background: value
            ? "var(--symp-accent, #0055A4)"
            : "var(--symp-line-2, rgba(14,14,15,0.14))",
          cursor: "pointer",
          transition: "background 0.2s ease",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--symp-ink, #0E0E0F)",
          }}
        >
          {label}
        </span>
        {hint && (
          <span
            style={{ fontSize: 11, color: "var(--symp-ink-3, #6F6F75)" }}
          >
            {hint}
          </span>
        )}
      </div>
    </label>
  );
}

function UpscaylSteps({
  selectImageHandler,
  selectFolderHandler,
  upscaylHandler,
  batchMode,
  setBatchMode,
  imagePath,
  doubleUpscayl,
  setDoubleUpscayl,
  dimensions,
}: IProps) {
  const [scale, setScale] = useAtom(scaleAtom);
  const [outputPath, setOutputPath] = useAtom(savedOutputPathAtom);
  const [progress] = useAtom(progressAtom);
  const rememberOutputFolder = useAtomValue(rememberOutputFolderAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);

  const logit = useLogger();
  const { toast } = useToast();
  const t = useAtomValue(translationAtom);

  const outputHandler = async () => {
    const path = await window.electron.invoke(ELECTRON_COMMANDS.SELECT_FOLDER);
    if (path !== null) {
      logit("🗂 Setting Output Path: ", path);
      setOutputPath(path);
    } else {
      setOutputPath(null);
    }
  };

  const upscaylResolution = useMemo(() => {
    const newDimensions = { width: dimensions.width, height: dimensions.height };
    const doubleScale = parseInt(scale) * parseInt(scale);
    const singleScale = parseInt(scale);
    if (doubleUpscayl) {
      if (useCustomWidth) {
        newDimensions.width = customWidth;
        newDimensions.height = Math.round(customWidth * (dimensions.height / dimensions.width));
      } else {
        newDimensions.width = dimensions.width * doubleScale;
        newDimensions.height = dimensions.height * doubleScale;
      }
    } else {
      if (useCustomWidth) {
        newDimensions.width = customWidth;
        newDimensions.height = Math.round(customWidth * (dimensions.height / dimensions.width));
      } else {
        newDimensions.width = dimensions.width * singleScale;
        newDimensions.height = dimensions.height * singleScale;
      }
    }
    return newDimensions;
  }, [dimensions.width, dimensions.height, doubleUpscayl, scale]);

  const hasFile = imagePath.length > 0;
  const hasOutput = !!outputPath;
  const isProcessing = progress.length > 0;

  const fileName = hasFile ? imagePath.split(/[\\/]/).pop() : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
      }}
    >
      {/* Batch mode toggle */}
      <div style={{ padding: "0 18px 18px" }}>
        <MiniToggle
          label={t("APP.BATCH_MODE.TITLE")}
          hint={t("APP.BATCH_MODE.DESCRIPTION")}
          value={batchMode}
          onChange={(v) => {
            if (!rememberOutputFolder) setOutputPath("");
            setBatchMode(v);
          }}
        />
      </div>

      {/* STEP 1 — Source */}
      <div style={{ padding: "0 18px" }}>
        <StepHeading
          n={1}
          title={t("APP.FILE_SELECTION.TITLE")}
          hint={hasFile ? fileName : undefined}
          done={hasFile}
          active={!hasFile}
        />
        <div style={{ paddingLeft: 32, marginBottom: 22 }}>
          <PrimaryBtn
            leading={batchMode ? <FolderIcon /> : <ImageIcon />}
            onClick={batchMode ? selectFolderHandler : selectImageHandler}
          >
            {batchMode
              ? t("APP.FILE_SELECTION.BATCH_MODE_TYPE")
              : t("APP.FILE_SELECTION.SINGLE_MODE_TYPE")}
          </PrimaryBtn>
        </div>
      </div>

      {/* STEP 2 — Model */}
      <div style={{ padding: "0 18px" }}>
        <StepHeading
          n={2}
          title={t("APP.MODEL_SELECTION.TITLE")}
          hint={t("APP.MODEL_SELECTION.DESCRIPTION")}
          done={false}
          active={hasFile}
        />
        <div style={{ paddingLeft: 32, marginBottom: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <SelectModelDialog />

          {!batchMode && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={doubleUpscayl}
                onChange={(e) => setDoubleUpscayl(e.target.checked)}
                style={{
                  accentColor: "var(--symp-accent, #0055A4)",
                  width: 14,
                  height: 14,
                  margin: 0,
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--symp-ink-2, #3A3A3D)",
                }}
              >
                {t("APP.DOUBLE_UPSCAYL.TITLE")}
              </span>
            </label>
          )}

          <SelectImageScale scale={scale} setScale={setScale} hideInfo />
        </div>
      </div>

      {/* STEP 3 — Output */}
      <div style={{ padding: "0 18px" }}>
        <StepHeading
          n={3}
          title={t("APP.OUTPUT_PATH_SELECTION.TITLE")}
          hint={outputPath || undefined}
          done={hasOutput}
          active={hasFile && !hasOutput}
        />
        <div style={{ paddingLeft: 32, marginBottom: 22 }}>
          {dimensions.width && dimensions.height && (
            <p
              style={{
                fontFamily: "var(--symp-mono, monospace)",
                fontSize: 11,
                color: "var(--symp-ink-3, #6F6F75)",
                marginBottom: 8,
              }}
            >
              {dimensions.width}×{dimensions.height}
              <span style={{ color: "var(--symp-accent, #0055A4)", fontWeight: 600, margin: "0 4px" }}>→</span>
              {upscaylResolution.width}×{upscaylResolution.height}
            </p>
          )}
          <GhostBtn leading={<FolderIcon />} onClick={outputHandler}>
            {outputPath
              ? t("APP.OUTPUT_PATH_SELECTION.BUTTON_TITLE")
              : t("APP.OUTPUT_PATH_SELECTION.BUTTON_TITLE")}
          </GhostBtn>
        </div>
      </div>

      {/* STEP 4 — Upscale */}
      <div style={{ padding: "0 18px" }}>
        <StepHeading
          n={4}
          title={t("APP.SCALE_SELECTION.TITLE")}
          hint={isProcessing ? t("APP.SCALE_SELECTION.IN_PROGRESS_BUTTON_TITLE") : undefined}
          done={false}
          active={hasFile && hasOutput}
        />
        <div style={{ paddingLeft: 32, marginBottom: 24 }}>
          <PrimaryBtn
            big
            disabled={!hasFile || !hasOutput || isProcessing}
            onClick={
              isProcessing || !outputPath
                ? () =>
                    toast({
                      description: t("APP.SCALE_SELECTION.NO_OUTPUT_FOLDER_ALERT"),
                    })
                : upscaylHandler
            }
          >
            {isProcessing
              ? t("APP.SCALE_SELECTION.IN_PROGRESS_BUTTON_TITLE")
              : t("APP.SCALE_SELECTION.START_BUTTON_TITLE")}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

export default UpscaylSteps;
