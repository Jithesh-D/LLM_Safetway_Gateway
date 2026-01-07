import React, { memo } from "react";
import { Activity } from "lucide-react";

const MetricCard = memo(({ label, value, active }) => (
  <div
    className={`bg-gray-800 p-4 rounded-xl border transition-colors duration-150 ${
      active ? "border-blue-500/50 bg-blue-900/10" : "border-gray-700"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-xs text-gray-500 uppercase">{label}</span>
      {active && <Activity className="w-3 h-3 text-blue-400 animate-pulse" />}
    </div>
    <div className="text-2xl font-mono font-bold text-white">{value}</div>
  </div>
));

export default MetricCard;
