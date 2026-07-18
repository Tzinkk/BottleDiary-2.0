import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { WineBottle } from '../types';
import { Globe, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WorldMapProps {
  bottles: WineBottle[];
}

export const WorldMap: React.FC<WorldMapProps> = ({ bottles }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  // Simple zoom scale state
  const [zoomScale, setZoomScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Get responsive container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      const calculatedHeight = Math.max(320, width * 0.5);
      setDimensions({ width, height: calculatedHeight });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch world GeoJSON data from a reliable CDN with fallback
  useEffect(() => {
    let active = true;
    const geoJsonUrls = [
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    ];

    const fetchGeoJson = async () => {
      for (const url of geoJsonUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.json();
          if (active) {
            setGeoData(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn(`Failed to fetch from ${url}:`, e);
        }
      }
      if (active) {
        setError('Unable to load world map database. Please check your internet connection.');
        setLoading(false);
      }
    };

    fetchGeoJson();

    return () => {
      active = false;
    };
  }, []);

  // Aggregate bottle volumes by country (case-insensitive)
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bottles.forEach(b => {
      if (b.country) {
        const normalized = b.country.trim().toLowerCase();
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    });
    return counts;
  }, [bottles]);

  // Robust matching helper to match country name or aliases
  const matchCountryCount = (geoName: string) => {
    const normGeo = geoName.trim().toLowerCase();
    
    // Direct match
    if (countryCounts[normGeo] !== undefined) {
      return countryCounts[normGeo];
    }
    
    // Alias/substring mapping
    for (const [userCountry, count] of Object.entries(countryCounts)) {
      const normUser = userCountry.trim().toLowerCase();
      
      if (
        normGeo.includes(normUser) || 
        normUser.includes(normGeo) ||
        (normGeo === 'united states of america' && normUser === 'usa') ||
        (normGeo === 'united states of america' && normUser === 'us') ||
        (normGeo === 'united states' && normUser === 'usa') ||
        (normGeo === 'united states' && normUser === 'us') ||
        (normGeo === 'united kingdom' && normUser === 'uk') ||
        (normGeo === 'korea' && normUser === 'south korea') ||
        (normGeo === 'viet nam' && normUser === 'vietnam') ||
        (normGeo === 'russian federation' && normUser === 'russia')
      ) {
        return count;
      }
    }
    
    return 0;
  };

  // List of countries logged
  const activeCountriesList = useMemo(() => {
    return (Object.entries(countryCounts) as [string, number][])
      .map(([name, count]) => {
        // Find proper display name
        let displayName = name.toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
        if (name === 'usa') displayName = 'United States';
        if (name === 'uk') displayName = 'United Kingdom';
        return { name: displayName, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [countryCounts]);

  const maxCount = useMemo(() => {
    const counts = Object.values(countryCounts) as number[];
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [countryCounts]);

  // Color scale configuration: Wild cherry dark background merging to elegant champagne gold!
  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([1, Math.max(1, maxCount)])
      .range(['#a83c50', '#E6C280']); // Rich light burgundy up to bright champagne gold
  }, [maxCount]);

  // Compute D3 Projection (NaturalEarth1 is elegant and modern)
  const projection = useMemo(() => {
    return d3.geoNaturalEarth1()
      .scale((dimensions.width / 5.8) * zoomScale)
      .translate([(dimensions.width / 2) + offsetX, (dimensions.height / 1.7) + offsetY]);
  }, [dimensions, zoomScale, offsetX, offsetY]);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Mouse handlers for tooltips
  const handleMouseEnter = (e: React.MouseEvent, geoName: string, count: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      name: geoName,
      count,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip(prev => prev ? {
        ...prev,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10
      } : null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Zoom actions
  const handleZoomIn = () => setZoomScale(prev => Math.min(5, prev + 0.25));
  const handleZoomOut = () => setZoomScale(prev => Math.max(0.75, prev - 0.25));
  const handleResetZoom = () => {
    setZoomScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffsetX(prev => prev + dx);
    setOffsetY(prev => prev + dy);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="glass-panel p-6 md:p-8 bg-white/5 border-white/10 rounded-sm relative overflow-hidden flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif text-ink mb-1 flex items-center gap-2">
            <Globe className="text-gold w-5 h-5 shrink-0" />
            Global Cellar Footprint
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-ink/30">
            Geographic distribution & volumes of logged origins
          </p>
        </div>

        {/* Map controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={handleZoomIn} 
            title="Zoom In"
            className="p-2 border border-white/5 rounded-sm bg-white/5 hover:bg-white/10 text-ink/70 hover:text-ink transition-all active:scale-95"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={handleZoomOut} 
            title="Zoom Out"
            className="p-2 border border-white/5 rounded-sm bg-white/5 hover:bg-white/10 text-ink/70 hover:text-ink transition-all active:scale-95"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={handleResetZoom} 
            title="Reset Map View"
            className="p-2 border border-white/5 rounded-sm bg-white/5 hover:bg-white/10 text-ink/70 hover:text-ink transition-all active:scale-95 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="w-full relative bg-[#1c0006]/30 border border-white/5 rounded-sm flex items-center justify-center cursor-grab active:cursor-grabbing select-none h-[320px] md:h-[420px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleDragMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-wine-bg/80">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-ink/40">Loading World Map Database...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <p className="text-red-400 font-serif text-lg mb-2">Map Loading Issue</p>
            <p className="text-xs text-ink/40 max-w-sm">{error}</p>
          </div>
        )}

        {!loading && !error && geoData && (
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            {/* Graticule/Gridlines for extra cartographic charm */}
            <path 
              d={pathGenerator(d3.geoGraticule()()) || ''} 
              fill="none" 
              stroke="rgba(255,255,255,0.015)" 
              strokeWidth={0.5} 
            />

            <g>
              {geoData.features.map((feature: any, i: number) => {
                const geoName = feature.properties?.name || 'Unknown';
                const count = matchCountryCount(geoName);
                const hasWine = count > 0;
                
                // Color coding
                const fillColor = hasWine 
                  ? colorScale(count) 
                  : 'rgba(255, 255, 255, 0.025)';
                const strokeColor = hasWine 
                  ? 'rgba(230, 194, 128, 0.45)' 
                  : 'rgba(255, 255, 255, 0.06)';
                const strokeWidth = hasWine ? 0.75 : 0.4;

                return (
                  <path
                    key={`${feature.id || geoName}-${i}`}
                    d={pathGenerator(feature) || ''}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                    onMouseEnter={(e) => handleMouseEnter(e, geoName, count)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {/* Dynamic Tooltip */}
        {tooltip && (
          <div 
            className="absolute z-50 pointer-events-none bg-[#340505] border border-[#E6C280]/30 p-2.5 rounded shadow-2xl transition-all duration-75 text-left"
            style={{ 
              left: `${tooltip.x}px`, 
              top: `${tooltip.y - 45}px`,
              transform: 'translateX(-50%)' 
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#E6C280] font-bold">
              {tooltip.name}
            </p>
            <p className="text-xs text-ink/80 font-serif italic mt-0.5">
              {tooltip.count} {tooltip.count === 1 ? 'bottle' : 'bottles'} logged
            </p>
          </div>
        )}
      </div>

      {/* Origin Stats Legend */}
      {activeCountriesList.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink/30 mb-3 font-bold">
            Cellar Origins Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {activeCountriesList.map(({ name, count }) => (
              <div 
                key={name}
                className="flex items-center justify-between p-2 border border-white/5 rounded-sm bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[10px] text-ink/80 truncate pr-2 font-medium">{name}</span>
                <span className="text-[10px] text-[#E6C280] font-mono bg-[#E6C280]/10 px-1.5 py-0.5 rounded-sm font-bold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
