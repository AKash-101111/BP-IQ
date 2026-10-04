import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Layers,
  Scale
} from 'lucide-react';
import { Project, Blueprint, BlueprintPage } from '../../types';

interface BlueprintViewerPageProps {
  project: Project | null;
  blueprints: Blueprint[];
  currentPageNum: number;
  onSelectPage: (pageNum: number) => void;
  onUploadBlueprint: () => void;
}

export const BlueprintViewerPage: React.FC<BlueprintViewerPageProps> = ({
  project,
  blueprints,
  currentPageNum,
  onSelectPage,
  onUploadBlueprint,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const activeBlueprint = blueprints.length > 0 ? blueprints[0] : null;
  const pages = activeBlueprint ? activeBlueprint.pages : [];
  const activePage: BlueprintPage | null =
    pages.length > 0
      ? pages.find((p) => p.page_number === currentPageNum) || pages[0]
      : null;

  // Fit to screen on initial image load
  const handleFitToScreen = () => {
    if (!containerRef.current || !activePage) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const padding = 60;

    const scaleX = (containerW - padding) / activePage.width;
    const scaleY = (containerH - padding) / activePage.height;
    const fitScale = Math.min(scaleX, scaleY, 1.5);

    const targetZoom = Math.max(0.2, fitScale);
    setZoom(targetZoom);
    setPan({
      x: (containerW - activePage.width * targetZoom) / 2,
      y: (containerH - activePage.height * targetZoom) / 2,
    });
  };

  useEffect(() => {
    if (activePage && containerRef.current) {
      handleFitToScreen();
    }
  }, [activePage?.id]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(6.0, Number((z * 1.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.15, Number((z / 1.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1.0);
    if (containerRef.current && activePage) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      setPan({
        x: (containerW - activePage.width) / 2,
        y: (containerH - activePage.height) / 2,
      });
    } else {
      setPan({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((z) => Math.max(0.15, Math.min(6.0, Number((z * zoomFactor).toFixed(3)))));
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

  // If no blueprint is available
  if (!activeBlueprint || !activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-canvas p-10 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-panel border border-borderline flex items-center justify-center text-textSecondary mb-4 shadow-sm">
          <Layers className="w-8 h-8 text-accent opacity-80" />
        </div>
        <h2 className="text-xl font-bold text-textPrimary">No Blueprint Loaded</h2>
        <p className="text-sm text-textSecondary max-w-md mt-2 mb-6">
          {project
            ? `Project "${project.name}" does not have an architectural drawing attached yet.`
            : 'Select or create a project to view its architectural drawing.'}
        </p>
        <button
          onClick={onUploadBlueprint}
          className="px-6 py-2.5 bg-accent text-white rounded font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Upload Construction Blueprint
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative w-full h-full overflow-hidden bg-[#181B20] select-none cursor-grab active:cursor-grabbing flex flex-col"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Minimal Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Drawing Info & Page Switcher */}
        <div className="flex items-center gap-2 bg-panel/95 backdrop-blur-md border border-borderline px-3 py-1.5 rounded-md shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-textPrimary max-w-[200px] truncate">
              {activeBlueprint.filename}
            </span>
          </div>

          <div className="h-4 w-px bg-borderline mx-1" />

          <div className="flex items-center gap-1 text-[11px] text-textSecondary mono-num">
            <Scale className="w-3.5 h-3.5" />
            <span>{activeBlueprint.scale_ratio || '1:100'}</span>
          </div>

          {pages.length > 1 && (
            <>
              <div className="h-4 w-px bg-borderline mx-1" />
              <div className="flex items-center gap-1">
                <button
                  disabled={activePage.page_number <= 1}
                  onClick={() => onSelectPage(activePage.page_number - 1)}
                  className="p-1 rounded hover:bg-canvas disabled:opacity-30 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="mono-num text-[11px] font-semibold text-textPrimary px-1">
                  Page {activePage.page_number} of {pages.length}
                </span>
                <button
                  disabled={activePage.page_number >= pages.length}
                  onClick={() => onSelectPage(activePage.page_number + 1)}
                  className="p-1 rounded hover:bg-canvas disabled:opacity-30 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Minimal View Controls */}
        <div className="flex items-center gap-1 bg-panel/95 backdrop-blur-md border border-borderline px-2 py-1.5 rounded-md shadow-lg pointer-events-auto">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="mono-num text-[11px] font-bold text-textPrimary px-2 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-borderline mx-1" />

          <button
            onClick={handleFitToScreen}
            className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded text-textSecondary hover:text-textPrimary hover:bg-canvas transition-colors"
            title="Actual Size (100%)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        <div className="relative inline-block shadow-2xl bg-white border border-black/20">
          <img
            ref={imageRef}
            src={activePage.image_url}
            alt={`Construction Blueprint Page ${activePage.page_number}`}
            className="max-w-none block pointer-events-none"
            style={{ width: activePage.width, height: activePage.height }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};
