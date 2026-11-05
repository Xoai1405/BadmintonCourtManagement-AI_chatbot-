import React, { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export default function ConflictAccordion({ conflicts, formattedTimeRange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm transition-all">
      <div
        className="bg-red-50 p-3.5 flex gap-3 items-start cursor-pointer hover:bg-red-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] text-red-600 font-bold mb-0.5">
            Có {conflicts.length} buổi bị trùng lịch
          </p>
          <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium select-none">
            Xem chi tiết <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-red-50/40 p-3 border-t border-red-100 max-h-48 overflow-y-auto">
          <ul className="space-y-2">
            {conflicts.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-[12px] text-red-700 bg-red-100/60 px-3 py-2.5 rounded-lg">
                <span className="font-bold">
                  {item.date ? item.date.split('-').reverse().join('/') : ''} ({item.dayOfWeek})
                </span>
                <span className="font-medium text-red-600/80">{formattedTimeRange}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}