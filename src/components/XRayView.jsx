import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Eye, Layers } from 'lucide-react';

const XRayView = ({ threatAnalysis, layers, result }) => {
  if (!threatAnalysis && !layers) return null;

  const getStatusIcon = (status) => {
    if (status === 'danger') return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === 'safe') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (status) => {
    if (status === 'danger') return 'text-red-400 border-red-500/30 bg-red-900/10';
    if (status === 'safe') return 'text-green-400 border-green-500/30 bg-green-900/10';
    return 'text-gray-400 border-gray-500/30 bg-gray-900/10';
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
        <Eye className="w-5 h-5 text-purple-400" />
        X-Ray Deep Analysis
      </h3>
      
      {/* Overall Threat Score */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Overall Threat Score</span>
          <span className={`font-bold text-lg ${
            threatAnalysis?.threatScore >= 50 ? 'text-red-400' : 
            threatAnalysis?.threatScore >= 30 ? 'text-orange-400' : 
            'text-green-400'
          }`}>
            {threatAnalysis?.threatScore || 0}/{threatAnalysis?.maxScore || 100}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              threatAnalysis?.threatScore >= 50 ? 'bg-red-500' : 
              threatAnalysis?.threatScore >= 30 ? 'bg-orange-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${threatAnalysis?.percentage || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Layer-by-Layer Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4" />
          Layer Analysis
        </h4>
        
        {layers && Object.entries(layers).map(([key, layer]) => (
          <div 
            key={key}
            className={`p-3 rounded-lg border ${getStatusColor(layer.status)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(layer.status)}
                <span className="font-semibold text-sm">{key}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                layer.status === 'danger' ? 'bg-red-500/20 text-red-400' : 
                'bg-green-500/20 text-green-400'
              }`}>
                {layer.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1">{layer.reason}</p>
            {layer.hits && layer.hits.length > 0 && (
              <div className="mt-2 space-y-1">
                {layer.hits.slice(0, 3).map((hit, idx) => (
                  <div key={idx} className="text-xs text-gray-400 font-mono bg-gray-900/50 p-1 rounded">
                    • {hit}
                  </div>
                ))}
              </div>
            )}
            {layer.deviationScore && (
              <div className="mt-2 text-xs text-gray-400">
                Deviation: {layer.deviationScore.toFixed(2)}
              </div>
            )}
            {layer.suspiciousScore !== undefined && (
              <div className="mt-2 text-xs text-gray-400">
                Suspicious Score: {layer.suspiciousScore.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Threat Breakdown */}
      {threatAnalysis?.breakdown && threatAnalysis.breakdown.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {threatAnalysis.breakdown.map((item, idx) => {
              const match = item.match(/(\d+\.?\d*)\/(\d+)/);
              const score = match ? parseFloat(match[1]) : 0;
              const max = match ? parseFloat(match[2]) : 0;
              const percentage = max > 0 ? (score / max) * 100 : 0;
              
              return (
                <div key={idx} className="bg-gray-900/50 p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300">{item.split(':')[0]}</span>
                    <span className="text-xs font-mono text-gray-400">{score}/{max}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${
                        percentage >= 70 ? 'bg-red-500' : 
                        percentage >= 40 ? 'bg-orange-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Verdict */}
      <div className={`mt-6 p-4 rounded-lg border-2 ${
        result === 'BLOCKED' ? 'border-red-500/50 bg-red-900/10' : 
        'border-green-500/50 bg-green-900/10'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result === 'BLOCKED' ? (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          )}
          <span className={`font-bold ${
            result === 'BLOCKED' ? 'text-red-400' : 'text-green-400'
          }`}>
            Final Verdict: {result}
          </span>
        </div>
        <p className="text-xs text-gray-300">
          {result === 'BLOCKED' 
            ? 'Prompt has been blocked due to security concerns detected across multiple layers.'
            : 'Prompt has passed all security layers and is safe to process.'}
        </p>
      </div>
    </div>
  );
};

export default XRayView;

