import SympLogo from "../icons/symp-logo";

const UpscaylLogo = () => {
  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        top: 8,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        padding: "6px 10px",
        background: "var(--symp-panel, #FFFFFF)",
        border: "1px solid var(--symp-line-2, rgba(14,14,15,0.14))",
        boxShadow: "0 2px 8px rgba(14,14,15,0.08)",
      }}
    >
      <SympLogo size={16} subtitle={false} />
    </div>
  );
};

export default UpscaylLogo;
