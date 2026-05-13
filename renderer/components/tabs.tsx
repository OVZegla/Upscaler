import React from "react";
import useTranslation from "./hooks/use-translation";

type TabsProps = {
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
};

const Tabs = ({ selectedTab, setSelectedTab }: TabsProps) => {
  const t = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        margin: "0 18px 14px",
        background: "var(--symp-bg-2, #F2F0EC)",
        borderRadius: 999,
        border: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
      }}
    >
      {[
        { id: 0, label: t("TITLE") },
        { id: 1, label: t("SETTINGS.TITLE") },
      ].map((tab) => {
        const on = selectedTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 999,
              border: 0,
              background: on
                ? "var(--symp-panel, #FFFFFF)"
                : "transparent",
              color: on
                ? "var(--symp-ink, #0E0E0F)"
                : "var(--symp-ink-3, #6F6F75)",
              fontFamily: "var(--symp-font, Geist, sans-serif)",
              fontWeight: on ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.18s ease",
              boxShadow: on
                ? "0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(14,14,15,0.05), 0 8px 24px rgba(14,14,15,0.06)"
                : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
