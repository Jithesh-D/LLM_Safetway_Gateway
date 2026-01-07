import React, { memo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const RadarChartComponent = ({ threatAnalysis, layers }) => {
  if (!threatAnalysis) return null;

  const radarData = [
    {
      dimension: "RITD",
      score: Math.min(
        100,
        (threatAnalysis.breakdown
          ?.find((d) => d.includes("RITD"))
          ?.match(/\d+/)?.[0] || 0) * 2.5
      ),
      fullMark: 100,
    },
    {
      dimension: "LDF",
      score: Math.min(
        100,
        (threatAnalysis.breakdown
          ?.find((d) => d.includes("LDF"))
          ?.match(/\d+\.?\d*/)?.[0] || 0) * 4
      ),
      fullMark: 100,
    },
    {
      dimension: "Context",
      score: Math.min(
        100,
        (threatAnalysis.breakdown
          ?.find((d) => d.includes("Context"))
          ?.match(/\d+\.?\d*/)?.[0] || 0) * 5
      ),
      fullMark: 100,
    },
    {
      dimension: "Obfuscation",
      score: Math.min(
        100,
        (threatAnalysis.breakdown
          ?.find((d) => d.includes("Obfuscation"))
          ?.match(/\d+/)?.[0] || 0) * 10
      ),
      fullMark: 100,
    },
    {
      dimension: "NCD",
      score: Math.min(
        100,
        (threatAnalysis.breakdown
          ?.find((d) => d.includes("NCD"))
          ?.match(/\d+\.?\d*/)?.[0] || 0) * 20
      ),
      fullMark: 100,
    },
  ];

  // Calculate actual scores from layers if available
  const actualData = [
    {
      dimension: "RITD",
      score: layers?.RITD?.status === "danger" ? 80 : 20,
      fullMark: 100,
    },
    {
      dimension: "LDF",
      score:
        layers?.LDF?.status === "danger"
          ? Math.min(100, (layers.LDF.deviationScore || 0) * 20)
          : 20,
      fullMark: 100,
    },
    {
      dimension: "Context",
      score:
        layers?.CONTEXT?.status === "danger"
          ? Math.min(100, (layers.CONTEXT.suspiciousScore || 0) * 100)
          : 20,
      fullMark: 100,
    },
    {
      dimension: "Obfuscation",
      score: layers?.OBFUSCATION?.status === "danger" ? 70 : 10,
      fullMark: 100,
    },
    {
      dimension: "NCD",
      score: layers?.NCD?.status === "danger" ? 60 : 20,
      fullMark: 100,
    },
  ];

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
        <span className="text-blue-400">📡</span>
        Threat Radar Analysis
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={actualData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#6B7280", fontSize: 10 }}
            />
            <Radar
              name="Threat Level"
              dataKey="score"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-gray-400 text-center">
        Higher values indicate greater threat risk in each dimension
      </div>
    </div>
  );
};

export default memo(RadarChartComponent);
