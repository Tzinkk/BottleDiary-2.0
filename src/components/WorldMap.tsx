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
    <div className="bg-white border border-[#EBE7DF] shadow-[0_2px_12px_rgba(28,25,23,0.04)] rounded-2xl p-6 md:p-8 relative overflow-hidden flex flex-col space-y-6 text-stone-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-900 mb-1 flex items-center gap-2.5">
            <Globe className="text-[#722F37] w-5 h-5 shrink-0" />
            <span>Global Cellar Footprint</span>
          </h3>
          <p className="text-xs font-medium tracking-wide text-stone-500">
            Geographic distribution & volumes of logged origins
          </p>
        </div>

        {/* Map controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={handleZoomIn} 
            title="Zoom In"
            className="p-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE7DF] border border-[#E5E0D8] text-stone-700 transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={handleZoomOut} 
            title="Zoom Out"
            className="p-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE7DF] border border-[#E5E0D8] text-stone-700 transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={handleResetZoom} 
            title="Reset Map View"
            className="px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE7DF] border border-[#E5E0D8] text-stone-700 transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5 text-xs tracking-wider font-semibold cursor-pointer"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="w-full relative bg-[#F5F2EA] border border-[#EBE7DF] rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none h-[320px] md:h-[420px] overflow-hidden shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleDragMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-[#F5F2EA]/80 backdrop-blur-sm">
            <div className="w-9 h-9 border-2 border-[#722F37]/30 border-t-[#722F37] rounded-full animate-spin"></div>
            <p className="text-xs uppercase tracking-widest font-semibold text-stone-600">Loading World Map Database...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#F5F2EA]/90 backdrop-blur-sm">
            <p className="text-[#800020] font-bold text-base mb-1">Map Loading Issue</p>
            <p className="text-xs text-stone-500 max-w-sm">{error}</p>
          </div>
        )}

        {!loading && !error && geoData && (
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            {/* Graticule/Gridlines */}
            <path 
              d={pathGenerator(d3.geoGraticule()()) || ''} 
              fill="none" 
              stroke="rgba(0,0,0,0.04)" 
              strokeWidth={0.5} 
            />

            <g>
              {geoData.features.map((feature: any, i: number) => {
                const geoName = feature.properties?.name || 'Unknown';
                const count = matchCountryCount(geoName);
                const hasWine = count > 0;
                
                // Light theme wine palette
                const fillColor = hasWine 
                  ? colorScale(count) 
                  : '#E5DFD3';
                const strokeColor = hasWine ? '#722F37' : '#D6CFBF';
                const strokeWidth = hasWine ? 1.2 : 0.5;

                return (
                  <path
                    key={`${feature.id || geoName}-${i}`}
                    d={pathGenerator(feature) || ''}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="transition-colors duration-150 hover:fill-[#800020] hover:opacity-100 cursor-pointer"
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
            className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-md border border-[#EBE7DF] p-3 rounded-xl shadow-lg transition-all duration-75 text-left"
            style={{ 
              left: `${tooltip.x}px`, 
              top: `${tooltip.y - 45}px`,
              transform: 'translateX(-50%)' 
            }}
          >
            <p className="text-xs uppercase tracking-wider text-[#722F37] font-bold">
              {tooltip.name}
            </p>
            <p className="text-xs text-amber-700 font-mono mt-0.5 font-semibold">
              {tooltip.count} {tooltip.count === 1 ? 'bottle' : 'bottles'} logged
            </p>
          </div>
        )}
      </div>

      {/* Origin Stats Legend */}
      {activeCountriesList.length > 0 && (
        <div className="pt-4 border-t border-[#EBE7DF]">
          <h4 className="text-xs uppercase tracking-wider text-stone-500 mb-3 font-semibold">
            Cellar Origins Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {activeCountriesList.map(({ name, count }) => (
              <div 
                key={name}
                className="flex items-center justify-between p-2.5 border border-[#EBE7DF] rounded-xl bg-[#FBF9F5] hover:bg-white hover:border-[#D6CFBF] transition-all"
              >
                <span className="text-xs text-stone-800 truncate pr-2 font-medium">{name}</span>
                <span className="text-xs text-[#722F37] font-mono bg-[#FDF2F4] border border-[#F5C2CB] px-2 py-0.5 rounded-md font-semibold">
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
