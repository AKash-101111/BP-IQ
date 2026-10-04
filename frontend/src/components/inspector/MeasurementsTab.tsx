import React from 'react';
import { RoomItem, WallItem, OpeningItem, DimensionItem } from '../../types';
import { Ruler, Maximize2, DoorOpen } from 'lucide-react';

interface MeasurementsTabProps {
  rooms: RoomItem[];
  walls: WallItem[];
  openings: OpeningItem[];
  dimensions: DimensionItem[];
  onFocusRoom?: (bbox: any) => void;
}

export const MeasurementsTab: React.FC<MeasurementsTabProps> = ({
  rooms,
  walls,
  openings,
  dimensions,
}) => {
  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Rooms Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-accent" />
            Detected Spaces ({rooms.length})
          </h4>
          <span className="mono-num text-[10px] text-textSecondary">
            Total: {rooms.reduce((acc, r) => acc + r.measured_area, 0).toFixed(1)} m²
          </span>
        </div>

        <div className="border border-borderline rounded overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas text-textSecondary text-[10px] uppercase border-b border-borderline">
                <th className="py-1.5 px-2 font-medium">Space Name</th>
                <th className="py-1.5 px-2 font-medium text-right">Stated</th>
                <th className="py-1.5 px-2 font-medium text-right">Measured</th>
                <th className="py-1.5 px-2 font-medium text-right">Dev.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderline">
              {rooms.map((r) => {
                const stated = r.stated_area;
                const dev = stated ? ((r.measured_area - stated) / stated) * 100 : null;
                const hasMismatch = dev !== null && Math.abs(dev) > 8;

                return (
                  <tr key={r.id} className="hover:bg-canvas/50">
                    <td className="py-1.5 px-2 font-medium text-textPrimary">
                      {r.name}
                      <div className="text-[10px] text-textSecondary mono-num">
                        {r.width ? `${r.width.toFixed(1)}m × ${r.length?.toFixed(1)}m` : 'Polyline'}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right mono-num text-textSecondary">
                      {stated ? `${stated.toFixed(1)}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right mono-num font-semibold text-textPrimary">
                      {r.measured_area.toFixed(1)} m²
                    </td>
                    <td
                      className={`py-1.5 px-2 text-right mono-num text-[10px] ${
                        hasMismatch ? 'text-issue font-bold' : 'text-textSecondary'
                      }`}
                    >
                      {dev !== null ? `${dev > 0 ? '+' : ''}${dev.toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wall Geometry Breakdown */}
      <div>
        <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-accent" />
          Wall Linear Metrics ({walls.length} Segments)
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-canvas border border-borderline rounded p-2">
            <span className="text-[10px] text-textSecondary uppercase">External Walls</span>
            <div className="mono-num font-bold text-textPrimary mt-0.5">
              {walls
                .filter((w) => w.wall_type === 'EXTERNAL')
                .reduce((acc, w) => acc + w.length, 0)
                .toFixed(1)}{' '}
              m
            </div>
            <span className="text-[10px] text-textSecondary">230mm Masonry</span>
          </div>
          <div className="bg-canvas border border-borderline rounded p-2">
            <span className="text-[10px] text-textSecondary uppercase">Internal Partitions</span>
            <div className="mono-num font-bold text-textPrimary mt-0.5">
              {walls
                .filter((w) => w.wall_type !== 'EXTERNAL')
                .reduce((acc, w) => acc + w.length, 0)
                .toFixed(1)}{' '}
              m
            </div>
            <span className="text-[10px] text-textSecondary">115mm Masonry</span>
          </div>
        </div>
      </div>

      {/* Openings (Doors & Windows) */}
      <div>
        <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
          <DoorOpen className="w-3.5 h-3.5 text-accent" />
          Openings & Fenestrations ({openings.length})
        </h4>
        <div className="border border-borderline rounded divide-y divide-borderline">
          {openings.map((op) => (
            <div key={op.id} className="p-2 flex items-center justify-between text-[11px]">
              <div>
                <span className="font-semibold text-textPrimary">{op.label || op.opening_type}</span>
                <span className="text-[10px] text-textSecondary mono-num ml-1.5">
                  ({op.width.toFixed(2)}m × {op.height.toFixed(2)}m)
                </span>
              </div>
              <span className="mono-num text-textSecondary text-[10px]">
                {op.area.toFixed(2)} m²
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
