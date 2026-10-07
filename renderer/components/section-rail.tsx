"use client";
import React from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  cutStripsAtom,
  panelSectionAtom,
  usePrintSizeAtom,
  type PanelSection,
} from "@/atoms/user-settings-atom";

/**
 * The permanent left rail.
 *
 * It lives above the panels rather than inside them, because Paramètres
 * belongs here: placed inside the settings panel it would vanish the moment
 * it was used, leaving no way back.
 */

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

const ScaleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const WallWidthIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <g strokeWidth="1.7">
      <rect x="2.5" y="2.5" width="19" height="11" rx="1.2" />
      <path d="M2.5 8h19" />
      <path d="M10 2.5v5.5M15.5 8v5.5" />
    </g>
    <g strokeWidth="2">
      <path d="M3.5 19.5h17" />
      <path d="M6.5 16.5L3.5 19.5l3 3" />
      <path d="M17.5 16.5l3 3-3 3" />
    </g>
  </svg>
);

const StripsIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="4.5" height="16" rx="1" />
    <rect x="9.75" y="4" width="4.5" height="16" rx="1" />
    <rect x="16.5" y="4" width="4.5" height="16" rx="1" />
  </svg>
);

const HelpIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2v.3" />
    <path d="M12 17h.01" />
  </svg>
);

const GearIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ITEM_H = 78;
const PAD_Y = 14;

function Item({
  icon,
  label,
  sub,
  active,
  badge,
  dot,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  active: boolean;
  badge?: string;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active}
      className="symp-press"
      style={{
        position: "relative",
        height: ITEM_H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        borderRadius: 10,
        border: "none",
        background: "transparent",
        color: active ? "var(--accent)" : "var(--ink-3)",
        cursor: "pointer",
        fontFamily: fontStack,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 600, lineHeight: 1.15 }}>
        {label}
        {sub && (
          <span style={{ display: "block", fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
            {sub}
          </span>
        )}
      </span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 3,
            right: 2,
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "1.5px 4px",
            borderRadius: 999,
            background: "var(--red-tint)",
            color: "var(--red)",
          }}
        >
          {badge}
        </span>
      )}
      {dot && !badge && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--red)",
          }}
        />
      )}
    </button>
  );
}

export default function SectionRail({
  settingsOpen,
  onOpenSettings,
  onOpenHelp,
}: {
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  const [section, setSection] = useAtom(panelSectionAtom);
  const [, setUsePrintSize] = useAtom(usePrintSizeAtom);
  const cutStrips = useAtomValue(cutStripsAtom);

  const SECTIONS: {
    id: PanelSection;
    label: string;
    sub: string;
    icon: React.ReactNode;
    badge?: string;
    dot?: boolean;
  }[] = [
    { id: "upscale", label: "Upscale", sub: "par facteur", icon: <ScaleIcon /> },
    { id: "print", label: "Taille", sub: "du mur", icon: <WallWidthIcon /> },
    {
      id: "strips",
      label: "Découpe",
      sub: "en bandes",
      icon: <StripsIcon />,
      badge: "Bêta",
      dot: cutStrips,
    },
  ];

  // The first two entries ARE the sizing mode, so choosing one sets it.
  const goTo = (next: PanelSection) => {
    if (settingsOpen) onOpenSettings();
    setSection(next);
    if (next === "upscale") setUsePrintSize(false);
    if (next === "print") setUsePrintSize(true);
  };

  const activeIndex = settingsOpen
    ? -1
    : SECTIONS.findIndex((s) => s.id === section);

  return (
    <nav
      style={{
        width: 106,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
        padding: `${PAD_Y}px 8px`,
      }}
    >
      {/* Sliding marker. One element that moves rather than a highlight that
          blinks from one item to the next. */}
      <div style={{ position: "relative" }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: activeIndex * ITEM_H,
            height: ITEM_H,
            borderRadius: 10,
            background: "var(--accent-tint)",
            opacity: activeIndex < 0 ? 0 : 1,
            transition:
              "top 0.34s cubic-bezier(0.34, 1.4, 0.5, 1), opacity 0.2s ease",
            pointerEvents: "none",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: -8,
            top: activeIndex * ITEM_H + ITEM_H / 2 - 13,
            width: 3,
            height: 26,
            borderRadius: "0 3px 3px 0",
            background: "var(--accent)",
            opacity: activeIndex < 0 ? 0 : 1,
            transition:
              "top 0.34s cubic-bezier(0.34, 1.4, 0.5, 1), opacity 0.2s ease",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          {SECTIONS.map((sec) => (
            <Item
              key={sec.id}
              icon={sec.icon}
              label={sec.label}
              sub={sec.sub}
              badge={sec.badge}
              dot={sec.dot}
              active={!settingsOpen && section === sec.id}
              onClick={() => goTo(sec.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}>
        <Item icon={<HelpIcon />} label="Aide" active={false} onClick={onOpenHelp} />
        <div style={{ position: "relative" }}>
          {settingsOpen && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                background: "var(--accent-tint)",
                pointerEvents: "none",
              }}
            />
          )}
          <Item
            icon={<GearIcon />}
            label="Paramètres"
            active={settingsOpen}
            onClick={onOpenSettings}
          />
        </div>
      </div>
    </nav>
  );
}
