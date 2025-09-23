import React from 'react';

interface NozzleProps {
  status: 'healthy' | 'unhealthy' | 'mild' | 'loading';
  isActive: boolean;
}

export default function Nozzle({ status, isActive }: NozzleProps) {
  let positionClass = "left-1/2 transform -translate-x-1/2";
  let colorClass = "bg-green-500";

  if (status === 'healthy') {
    positionClass = "right-2";
    colorClass = "bg-green-500";
  } else if (status === 'unhealthy') {
    positionClass = "left-2";
    colorClass = "bg-red-500";
  } else if (status === 'mild') {
    positionClass = "left-1/2 transform -translate-x-1/2";
    colorClass = "bg-yellow-500";
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-100 via-yellow-100 to-red-100"></div>
        <div 
          className={`absolute top-1 h-6 w-6 rounded-full transition-all duration-1000 ease-in-out ${positionClass} ${colorClass} shadow-lg`}
        >
          {isActive && (
            <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-75"></div>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-2 text-sm text-gray-600">
        <span>🩴 Spray</span>
        <span>⚖️ Normal</span>
        <span>🚫 Stop</span>
      </div>
    </div>
  );
}