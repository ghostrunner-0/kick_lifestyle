import toast from "react-hot-toast";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export const showToast = (type, message) => {
  const base = {
    background: "#fff",
    color: "#333",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    minWidth: "260px",
    maxWidth: "340px",
    transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
    opacity: 1,
    transform: "translateY(0) scale(1)",
    animation: "toast-in 0.5s cubic-bezier(.4,0,.2,1)",
  };

  const icons = {
    success: <CheckCircle size={18} color="#16a34a" />,
    error: <XCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#2563eb" />,
    warning: <AlertTriangle size={18} color="#ca8a04" />,
  };

  const opts = { duration: 4000, position: "bottom-right" };

  toast.custom((t) => (
    <div
      style={{
        ...base,
        ...(t.visible
          ? { opacity: 1, transform: "translateY(0) scale(1)" }
          : { opacity: 0, transform: "translateY(40px) scale(0.95)" }),
      }}
    >
      {icons[type] || icons.info}
      <span style={{ flex: 1 }}>{message}</span>
      <style>{`
        @keyframes toast-in {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  ), opts);
};
