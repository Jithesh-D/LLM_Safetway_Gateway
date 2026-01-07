import React, { memo } from "react";
import { RefreshCw } from "lucide-react";

const PipelineNode = ({
  title,
  subtitle,
  icon: Icon,
  status,
  active,
  description,
}) => {
  const getBorderColor = () => {
    if (status === "danger") return "border-red-500 shadow-red-500/30";
    if (status === "safe") return "border-emerald-500 shadow-emerald-500/30";
    if (active) return "border-blue-400 shadow-blue-400/50";
    return "border-gray-600";
  };

  const getBgColor = () => {
    if (status === "danger") return "bg-red-900/20";
    if (status === "safe") return "bg-emerald-900/20";
    if (active) return "bg-blue-900/20";
    return "bg-gray-900";
  };

  const getIconColor = () => {
    if (status === "danger") return "text-red-400";
    if (status === "safe") return "text-emerald-400";
    if (active) return "text-blue-400";
    return "text-gray-500";
  };

  return (
    <div className="relative flex flex-col items-center group">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-xl transition-all duration-150 z-20 ${getBorderColor()} ${getBgColor()}`}
      >
        {status === "scanning" ? (
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        ) : (
          <Icon className={`w-8 h-8 ${getIconColor()}`} />
        )}
      </div>

      {/* Connector highlight */}
      {status === "safe" && (
        <div className="absolute top-1/2 left-1/2 w-[200%] h-1 bg-emerald-500 -z-10 -translate-y-1/2 origin-left animate-in fade-in duration-500"></div>
      )}

      <div className="mt-4 text-center">
        <h3
          className={`font-bold text-sm ${
            active ? "text-white" : "text-gray-400"
          }`}
        >
          {title}
        </h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>

      {/* Tooltip-like description */}
      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] p-2 rounded border border-gray-700 w-32 text-center pointer-events-none z-30">
        {description}
      </div>
    </div>
  );
};

export default memo(PipelineNode);
