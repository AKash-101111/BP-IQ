import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { BlueprintPage, IssueItem, RoomItem, WallItem, OpeningItem, DimensionItem } from '../../types';

interface BlueprintViewerProps {
  page: BlueprintPage | null;
  pages: BlueprintPage[];
  onSelectPage: (pageNum: number) => void;
  issues: IssueItem[];
  rooms: RoomItem[];
  walls: WallItem[];
  openings: OpeningItem[];
  dimensions: DimensionItem[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string | null) => void;
}

export const BlueprintViewer: React.FC<BlueprintViewerProps> = ({
  page,
  pages,
  onSelectPage,
  issues,
  rooms,
  walls,
  openings,
  dimensions,
  selectedIssueId,
  onSelectIssue,
}) => {
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMarkedUp, setShowMarkedUp] = useState(true);
  const [showIssuesLayer, setShowIssuesLayer] = useState(true);
  const [showRoomsLayer, setShowRoomsLayer] = useState(true);
  const [showWallsLayer, setShowWallsLayer] = useState(true);
  const [showDimensionsLayer, setShowDimensionsLayer] = useState(true);
  const [hoveredIssue, setHoveredIssue] = useState<IssueItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus and zoom when selectedIssueId changes
  useEffect(() => {
    if (!selectedIssueId || !page) return;
    const targetIssue = issues.find((i) => i.id === selectedIssueId);
    if (!targetIssue || !targetIssue.bbox) return;

    if (targetIssue.page_number !== page.page_number) {
      onSelectPage(targetIssue.page_number);
      return;
    }

    // Center on issue bbox
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      const issueCenterX = targetIssue.bbox.x + targetIssue.bbox.width / 2;
      const issueCenterY = targetIssue.bbox.y + targetIssue.bbox.height / 2;

      const targetZoom = 1.8;
      setZoom(targetZoom);
      setPan({
        x: containerW / 2 - issueCenterX * targetZoom,
        y: containerH / 2 - issueCenterY * targetZoom,
      });
    }
  }, [selectedIssueId, page]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(8.0, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z / 1.25));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => Math.max(0.15, Math.min(8.0, z * zoomFactor)));
  };

  // Pan drag events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-canvas border-r border-borderline p-8 select-none">
        <div className="w-16 h-16 rounded-full bg-borderline/50 flex items-center justify-center text-textSecondary mb-3">
          <Layers className="w-8 h-8 opacity-60" />
        </div>
        <h3 className="text-sm font-semibold text-textPrimary">No Blueprint Drawing Loaded</h3>
        <p className="text-xs text-textSecondary text-center max-w-sm mt-1">
          Upload a construction blueprint (PDF, PNG, JPG) or select an existing project from the header to activate the computer vision workbench.
        </p>
      </div>
    );
  }

  // Filter items for current page
  const pageIssues = issues.filter((i) => i.page_number === page.page_number && i.bbox);
  const pageRooms = rooms.filter((r) => r.page_number === page.page_number);
  const pageWalls = walls.filter((w) => w.page_number === page.page_number);
  const pageDimensions = dimensions.filter((d) => d.page_number === page.page_number);

  // Active image source: toggle between marked-up raster or raw drawing
  const currentImgUrl = showMarkedUp && page.marked_image_url ? page.marked_image_url : page.image_url;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#1E2228] select-none flex flex-col cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Page Navigator & Layer Switches */}
        <div className="flex items-center gap-1.5 bg-panel/95 backdrop-blur-sm border border-borderline px-2 py-1 rounded shadow-elevation pointer-events-auto">
          {pages.length > 1 && (
            <div className="flex items-center gap-1 border-r border-borderline pr-2 mr-1">
              <button
                disabled={page.page_number <= 1}
                onClick={() => onSelectPage(page.page_number - 1)}
                className="p-1 rounded hover:bg-canvas disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="mono-num text-[11px] font-medium text-textPrimary px-1">
                P.{page.page_number}/{pages.length}
              </span>
              <button
                disabled={page.page_number >= pages.length}
                onClick={() => onSelectPage(page.page_number + 1)}
                className="p-1 rounded hover:bg-canvas disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle Raw vs Marked */}
          <button
            onClick={() => setShowMarkedUp(!showMarkedUp)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              showMarkedUp
                ? 'bg-accent text-white'
                : 'bg-canvas text-textSecondary hover:text-textPrimary'
            }`}
          >
            {showMarkedUp ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Marked-Up</span>
          </button>

          <div className="h-4 w-px bg-borderline mx-1" />

          {/* Layer toggles */}
          <button
            onClick={() => setShowIssuesLayer(!showIssuesLayer)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              showIssuesLayer
                ? 'bg-issue-subtle text-issue border border-issue-border'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Issues ({pageIssues.length})
          </button>

          <button
            onClick={() => setShowRoomsLayer(!showRoomsLayer)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              showRoomsLayer
                ? 'bg-accent-subtle text-accent border border-accent/20'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Rooms ({pageRooms.length})
          </button>

          <button
            onClick={() => setShowDimensionsLayer(!showDimensionsLayer)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              showDimensionsLayer
                ? 'bg-canvas text-textPrimary border border-borderline'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Dimensions
          </button>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-1 bg-panel/95 backdrop-blur-sm border border-borderline px-2 py-1 rounded shadow-elevation pointer-events-auto">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="mono-num text-[11px] font-semibold text-textPrimary px-1.5 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas / Image Render Surface */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <div className="relative inline-block shadow-2xl bg-white">
          <img
            src={currentImgUrl}
            alt={`Blueprint Page ${page.page_number}`}
            className="max-w-none block pointer-events-none"
            style={{ width: page.width, height: page.height }}
          />

          {/* Interactive SVG Overlay Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ width: page.width, height: page.height }}
          >
            {/* Rooms Polygons Layer */}
            {showRoomsLayer &&
              pageRooms.map((r) => (
                <g key={r.id}>
                  <rect
                    x={r.bbox.x}
                    y={r.bbox.y}
                    width={r.bbox.width}
                    height={r.bbox.height}
                    fill="rgba(49, 94, 155, 0.08)"
                    stroke="rgba(49, 94, 155, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={r.bbox.x + 8}
                    y={r.bbox.y + 16}
                    fill="#315E9B"
                    fontSize="11"
                    fontFamily="Inter, sans-serif"
                    fontWeight="600"
                  >
                    {r.name} ({r.measured_area.toFixed(1)} m²)
                  </text>
                </g>
              ))}

            {/* Interactive Issues Layer */}
            {showIssuesLayer &&
              pageIssues.map((iss, idx) => {
                const isSelected = selectedIssueId === iss.id;
                const isCritOrHigh = iss.severity === 'CRITICAL' || iss.severity === 'HIGH';
                const strokeColor = isCritOrHigh ? '#C43D3D' : '#B7791F';
                const fillColor = isCritOrHigh
                  ? 'rgba(196, 61, 61, 0.22)'
                  : 'rgba(183, 121, 31, 0.20)';

                const x = iss.bbox!.x;
                const y = iss.bbox!.y;
                const w = iss.bbox!.width;
                const h = iss.bbox!.height;

                return (
                  <g
                    key={iss.id}
                    className="cursor-pointer transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIssue(iss.id);
                    }}
                    onMouseEnter={() => setHoveredIssue(iss)}
                    onMouseLeave={() => setHoveredIssue(null)}
                  >
                    {/* Bounding box */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 4 : 2.5}
                      className={isSelected ? 'filter drop-shadow-md' : ''}
                    />

                    {/* Circular Numbered Badge */}
                    <circle
                      cx={x}
                      cy={y}
                      r={14}
                      fill={strokeColor}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y + 4}
                      fill="#FFFFFF"
                      fontSize="10"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </text>

                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={20}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ transformOrigin: `${x}px ${y}px` }}
                      />
                    )}
                  </g>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredIssue && (
        <div
          className="absolute bottom-5 left-5 max-w-md bg-panel/95 backdrop-blur-md border border-borderline rounded p-3 shadow-elevation z-30 pointer-events-none"
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold mono-num uppercase ${
                hoveredIssue.severity === 'CRITICAL' || hoveredIssue.severity === 'HIGH'
                  ? 'bg-issue-subtle text-issue border border-issue-border'
                  : 'bg-warning-subtle text-warning border border-warning-border'
              }`}
            >
              {hoveredIssue.issue_code} • {hoveredIssue.severity}
            </span>
            <span className="text-[10px] text-textSecondary mono-num">
              Page {hoveredIssue.page_number}
            </span>
          </div>
          <h4 className="text-xs font-bold text-textPrimary leading-tight">{hoveredIssue.title}</h4>
          <p className="text-[11px] text-textSecondary mt-1 leading-snug">{hoveredIssue.evidence}</p>
          <div className="mt-2 pt-1.5 border-t border-borderline/60 flex items-center justify-between text-[10px] text-textSecondary">
            <span>Ref: {hoveredIssue.rag_reference || 'National Building Standard'}</span>
            <span className="text-accent font-medium">Click to inspect</span>
          </div>
        </div>
      )}
    </div>
  );
};
