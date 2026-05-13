import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import React from "react";

const SidebarToggleButton = ({
  showSidebar,
  setShowSidebar,
}: {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <button
      className={cn(
        "fixed left-0 top-1/2 z-50 -translate-y-1/2",
        showSidebar ? "hidden" : "",
      )}
      style={{
        padding: "12px 8px 12px 4px",
        borderRadius: "0 10px 10px 0",
        background: "var(--symp-panel, #FFFFFF)",
        border: "1px solid var(--symp-line-2, rgba(14,14,15,0.14))",
        borderLeft: 0,
        boxShadow: "2px 0 8px rgba(14,14,15,0.08)",
      }}
      onClick={() => setShowSidebar((prev) => !prev)}
    >
      <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--symp-ink-3, #6F6F75)" }} />
    </button>
  );
};

export default SidebarToggleButton;
