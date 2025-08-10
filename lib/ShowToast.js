import toast from "react-hot-toast";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export const showToast = (type, message) => {
  const base = {
    background: "#fff",
    color: "#333",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const icons = {
    success: <CheckCircle size={18} color="#16a34a" />,
    error: <XCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#2563eb" />,
    warning: <AlertTriangle size={18} color="#ca8a04" />,
  };

  const opts = { duration: 4000, position: "top-right" };

  toast.custom((t) => (
    <div
      style={{
        ...base,
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  ), opts);
};
