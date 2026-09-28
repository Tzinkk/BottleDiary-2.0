import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { WineBottle, WINE_TYPE_CONFIG } from '../types';
import { 
  Globe, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronRight, 
  ArrowLeft, 
  Wine, 
  MapPin, 
  FlaskConical, 
  X,
  Layers
} from 'lucide-react';

interface WorldMapProps {
  bottles: WineBottle[];
  onSelectBottle?: (bottle: WineBottle) => void;
}

const normalizeCountryName = (c?: string | null): string => {
  if (!c) return '';
  const s = c.trim().toLowerCase();
  if (s === 'usa' || s === 'us' || s === 'united states of america') return 'united states';
  if (s === 'uk' || s === 'great britain' || s === 'england') return 'united kingdom';
  if (s === 'korea' || s === 'south korea') return 'south korea';
  if (s === 'viet nam' || s === 'vietnam') return 'vietnam';
  if (s === 'russian federation' || s === 'russia') return 'russia';
  return s;
};

const isCountryMatch = (c1?: string | null, c2?: string | null): boolean => {
  if (!c1 || !c2) return false;
  const n1 = normalizeCountryName(c1);
  const n2 = normalizeCountryName(c2);
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

const COUNTRY_FLAGS: Record<string, string> = {
  'france': '🇫🇷',
  'italy': '🇮🇹',
  'spain': '🇪🇸',
  'united states': '🇺🇸',
  'usa': '🇺🇸',
  'us': '🇺🇸',
  'australia': '🇦🇺',
  'germany': '🇩🇪',
  'austria': '🇦🇹',
  'new zealand': '🇳🇿',
  'portugal': '🇵🇹',
  'argentina': '🇦🇷',
  'chile': '🇨🇱',
  'south africa': '🇿🇦',
  'greece': '🇬🇷',
  'thailand': '🇹🇭',
  'japan': '🇯🇵',
  'united kingdom': '🇬🇧',
  'uk': '🇬🇧',
  'great britain': '🇬🇧',
  'england': '🇬🇧',
  'canada': '🇨🇦',
  'switzerland': '🇨🇭',
  'hungary': '🇭🇺',
  'lebanon': '🇱🇧',
  'israel': '🇮🇱',
  'georgia': '🇬🇪',
  'armenia': '🇦🇲',
  'china': '🇨🇳',
  'uruguay': '🇺🇾',
  'mexico': '🇲🇽',
  'slovenia': '🇸🇮',
  'croatia': '🇭🇷',
  'romania': '🇷🇴',
  'bulgaria': '🇧🇬',
  'brazil': '🇧🇷',
  'turkey': '🇹🇷',
  'india': '🇮🇳',
};

export const getCountryFlag = (country?: string | null): string => {
  if (!country) return '🍷';
  const clean = country.trim().toLowerCase();
  if (COUNTRY_FLAGS[clean]) return COUNTRY_FLAGS[clean];
  
  for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return flag;
    }
  }
  return '🍷';
};

export const WorldMap: React.FC<WorldMapProps> = ({ bottles, onSelectBottle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 420 });
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  // Drill-down hierarchy state (Level 1: Country -> Level 2: Region -> Level 3: Grapes & Bottles)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedGrapeFilter, setSelectedGrapeFilter] = useState<string | null>(null);

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
    if (countryCounts[normGeo] !== undefined) {
      return countryCounts[normGeo];
    }
    
    for (const [userCountry, count] of Object.entries(countryCounts)) {
      if (isCountryMatch(userCountry, geoName)) {
        return count;
      }
    }
    return 0;
  };

  // List of countries logged
  const activeCountriesList = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    bottles.forEach(b => {
      const countryRaw = b.country?.trim() || 'Other / Unspecified';
      const norm = normalizeCountryName(countryRaw);
      let displayName = countryRaw === 'Other / Unspecified' ? 'Other / Unspecified' : countryRaw.replace(/\b\w/g, c => c.toUpperCase());
      if (norm === 'united states') displayName = 'United States';
      if (norm === 'united kingdom') displayName = 'United Kingdom';
      if (norm === 'south korea') displayName = 'South Korea';

      const existing = map.get(norm);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(norm, {
          name: displayName,
          count: 1
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [bottles]);

  const maxCount = useMemo(() => {
    const counts = Object.values(countryCounts) as number[];
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [countryCounts]);

  // Color scale configuration: Wild cherry dark background merging to elegant champagne gold!
  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([1, Math.max(1, maxCount)])
      .range(['#a83c50', '#E6C280']);
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

  // Level 2: Filter bottles for selected country
  const selectedCountryBottles = useMemo(() => {
    if (!selectedCountry) return [];
    return bottles.filter(b => {
      const countryRaw = b.country?.trim() || 'Other / Unspecified';
      if (selectedCountry === 'Other / Unspecified') {
        return !b.country || countryRaw === 'Other / Unspecified';
      }
      return isCountryMatch(countryRaw, selectedCountry);
    });
  }, [bottles, selectedCountry]);

  // Level 2: Group regions present in selected country
  const regionsList = useMemo(() => {
    if (!selectedCountry || selectedCountryBottles.length === 0) return [];
    const regionMap = new Map<string, {
      name: string;
      bottles: WineBottle[];
      grapes: string[];
    }>();

    selectedCountryBottles.forEach(b => {
      const regionName = (b.region && b.region.trim()) ? b.region.trim() : 'Other / Unspecified';
      const existing = regionMap.get(regionName);

      if (existing) {
        existing.bottles.push(b);
        (b.grape || []).forEach(g => {
          if (g && !existing.grapes.includes(g.trim())) existing.grapes.push(g.trim());
        });
      } else {
        regionMap.set(regionName, {
          name: regionName,
          bottles: [b],
          grapes: (b.grape || []).map(g => g.trim()).filter(Boolean)
        });
      }
    });

    return Array.from(regionMap.values())
      .map(r => ({
        ...r,
        count: r.bottles.length
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedCountry, selectedCountryBottles]);

  // Level 3: Bottles in selected region
  const selectedRegionBottles = useMemo(() => {
    if (!selectedRegion || selectedCountryBottles.length === 0) return [];
    return selectedCountryBottles.filter(b => {
      const regionName = (b.region && b.region.trim()) ? b.region.trim() : 'Other / Unspecified';
      return regionName.toLowerCase() === selectedRegion.toLowerCase();
    });
  }, [selectedRegion, selectedCountryBottles]);

  // Level 3: Grape varietals in selected region
  const regionGrapesList = useMemo(() => {
    if (selectedRegionBottles.length === 0) return [];
    const counts: Record<string, number> = {};
    selectedRegionBottles.forEach(b => {
      if (b.grape && b.grape.length > 0) {
        b.grape.forEach(g => {
          const trimmed = g.trim();
          if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
        });
      } else {
        counts['Other / Unspecified'] = (counts['Other / Unspecified'] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedRegionBottles]);

  // Level 3: Bottles filtered by selected grape (if active)
  const displayedBottlesInRegion = useMemo(() => {
    if (!selectedGrapeFilter) return selectedRegionBottles;
    if (selectedGrapeFilter === 'Other / Unspecified') {
      return selectedRegionBottles.filter(b => !b.grape || b.grape.length === 0);
    }
    return selectedRegionBottles.filter(b =>
      (b.grape || []).some(g => g.trim().toLowerCase() === selectedGrapeFilter.toLowerCase())
    );
  }, [selectedRegionBottles, selectedGrapeFilter]);

  // Country select helper from map click
  const handleCountrySelectFromMap = (geoName: string) => {
    const match = activeCountriesList.find(c => isCountryMatch(c.name, geoName));
    if (match) {
      setSelectedCountry(match.name);
      setSelectedRegion(null);
      setSelectedGrapeFilter(null);
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

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
                const isSelected = selectedCountry && isCountryMatch(selectedCountry, geoName);
                
                // Light theme wine palette
                const fillColor = hasWine 
                  ? colorScale(count) 
                  : '#E5DFD3';
                const strokeColor = isSelected ? '#5A1E24' : hasWine ? '#722F37' : '#D6CFBF';
                const strokeWidth = isSelected ? 2 : hasWine ? 1.2 : 0.5;

                return (
                  <path
                    key={`${feature.id || geoName}-${i}`}
                    d={pathGenerator(feature) || ''}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className={`transition-colors duration-150 cursor-pointer ${
                      hasWine ? 'hover:fill-[#800020] hover:opacity-100' : ''
                    }`}
                    onClick={() => {
                      if (hasWine) {
                        handleCountrySelectFromMap(geoName);
                      }
                    }}
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

      {/* Interactive Hierarchical Origins Breakdown (Unified 2-Column Grid Layout) */}
      {activeCountriesList.length > 0 && (
        <div ref={breakdownRef} id="cellar-origins-breakdown" className="pt-5 border-t border-[#EBE7DF] space-y-4">
          {/* Breadcrumbs & Navigation Bar (When drilled into Level 2 or Level 3) */}
          {selectedCountry && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCountry(null);
                    setSelectedRegion(null);
                    setSelectedGrapeFilter(null);
                  }}
                  className="text-stone-500 hover:text-[#722F37] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Globe size={13} className="text-[#722F37]" />
                  <span>All Countries</span>
                </button>

                <ChevronRight size={13} className="text-stone-400 shrink-0" />

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegion(null);
                    setSelectedGrapeFilter(null);
                  }}
                  className={`font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedRegion ? 'text-stone-500 hover:text-[#722F37]' : 'text-[#722F37] font-bold'
                  }`}
                >
                  <span className="text-sm">{getCountryFlag(selectedCountry)}</span>
                  <span>{selectedCountry}</span>
                </button>

                {selectedRegion && (
                  <>
                    <ChevronRight size={13} className="text-stone-400 shrink-0" />
                    <span className="text-[#722F37] font-bold">
                      {selectedRegion}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedRegion) {
                    setSelectedRegion(null);
                    setSelectedGrapeFilter(null);
                  } else if (selectedCountry) {
                    setSelectedCountry(null);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F2EFE9] text-stone-700 hover:text-[#722F37] border border-[#E6DFD5] rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <ArrowLeft size={13} />
                <span>{selectedRegion ? `Back to ${selectedCountry}` : 'Back to Countries'}</span>
              </button>
            </div>
          )}

          {/* LEVEL 1: Countries Breakdown (Full-Width List Layout) */}
          {!selectedCountry && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h4 className="text-sm uppercase tracking-wider text-stone-900 font-bold font-serif flex items-center gap-2">
                    <span>Cellar Origins Breakdown</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    Tap a country to explore regional appellations and cellar wines
                  </p>
                </div>
                <span className="text-xs font-mono text-stone-500 font-medium bg-[#FAF8F5] border border-[#E6DFD5] px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {activeCountriesList.length} Countries • {bottles.length} Bottles
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {activeCountriesList.map((country) => (
                  <button 
                    key={country.name}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country.name);
                      setSelectedRegion(null);
                      setSelectedGrapeFilter(null);
                    }}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-[#EBE5DC] shadow-xs hover:border-[#800020] hover:shadow-sm transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                      <span className="text-base sm:text-lg shrink-0 select-none leading-none">
                        {getCountryFlag(country.name)}
                      </span>
                      <span className="text-sm font-serif font-semibold tracking-wide text-[#2C1810] uppercase group-hover:text-[#800020] transition-colors">
                        {country.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FDF0ED] text-[#800020] border border-[#F5C2CB]/50">
                        {country.count} {country.count === 1 ? 'bottle' : 'bottles'}
                      </span>
                      <span className="text-sm text-[#800020] font-bold group-hover:translate-x-0.5 transition-transform">›</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 2: Regions of Selected Country (2-Column Grid Layout) */}
          {selectedCountry && !selectedRegion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(selectedCountry)}</span>
                    <span>Appellations & Regions in {selectedCountry}</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    {regionsList.length} distinct {regionsList.length === 1 ? 'region' : 'regions'} found across {selectedCountryBottles.length} cellar bottles.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {regionsList.map((region) => (
                  <button
                    key={region.name}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(region.name);
                      setSelectedGrapeFilter(null);
                    }}
                    className="flex flex-col justify-between p-3.5 sm:p-4 border border-[#EBE7DF] hover:border-[#722F37]/50 rounded-2xl bg-white text-left transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                  >
                    <div className="space-y-2">
                      {/* Header: Region name (serif, bold, max 2 lines) and bottle count tag */}
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-serif font-bold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-[#722F37] transition-colors">
                          {region.name}
                        </h5>
                        <span className="text-[11px] text-[#722F37] font-mono font-bold bg-[#FDF2F4] border border-[#F5C2CB] px-2 py-0.5 rounded-full shrink-0">
                          {region.count}
                        </span>
                      </div>

                      {/* Middle: 1–2 compact grape pills (with +X for overflow) */}
                      {region.grapes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {region.grapes.slice(0, 2).map(g => (
                            <span key={g} className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-stone-600 border border-[#E6DFD5] truncate max-w-[120px]">
                              {g}
                            </span>
                          ))}
                          {region.grapes.length > 2 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500">
                              +{region.grapes.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-stone-400 italic">Appellation varietals</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-xs font-semibold text-[#722F37]">
                      <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">Explore</span>
                      <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 3: Grapes & Bottles in Selected Region (2-Column Grid Layout) */}
          {selectedCountry && selectedRegion && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2EFE9] pb-3">
                <div>
                  <h4 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(selectedCountry)}</span>
                    <span>{selectedRegion}, {selectedCountry}</span>
                  </h4>
                  <p className="text-xs text-stone-500">
                    {selectedRegionBottles.length} {selectedRegionBottles.length === 1 ? 'bottle' : 'bottles'} in reserve
                  </p>
                </div>
              </div>

              {/* Grape Varietals in this region */}
              {regionGrapesList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider text-stone-600 flex items-center gap-1.5">
                      <FlaskConical size={14} className="text-[#722F37]" />
                      <span>Grape Varietals Collected ({regionGrapesList.length})</span>
                    </span>
                    {selectedGrapeFilter && (
                      <button
                        type="button"
                        onClick={() => setSelectedGrapeFilter(null)}
                        className="text-[11px] font-semibold text-[#722F37] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} />
                        <span>Clear Grape Filter</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {regionGrapesList.map(({ name, count }) => {
                      const isActive = selectedGrapeFilter?.toLowerCase() === name.toLowerCase();
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setSelectedGrapeFilter(prev => prev?.toLowerCase() === name.toLowerCase() ? null : name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-2 cursor-pointer shadow-xs ${
                            isActive
                              ? 'bg-[#722F37] text-white border-[#722F37] shadow-sm font-bold'
                              : 'bg-white hover:bg-[#FAF8F5] text-stone-700 border-[#E6DFD5]'
                          }`}
                        >
                          <span>{name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#FAF8F5] text-[#722F37] border border-[#F5C2CB]'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottle List from Selected Region (2-Column Grid Layout) */}
              <div className="space-y-2.5">
                <h5 className="text-xs uppercase font-bold tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Layers size={14} className="text-[#722F37]" />
                  <span>Cellar Bottles ({displayedBottlesInRegion.length})</span>
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  {displayedBottlesInRegion.map((bottle) => {
                    const typeConfig = WINE_TYPE_CONFIG[bottle.type] || {
                      text: 'text-[#800020]',
                      bg: 'bg-[#FDF2F4]',
                      border: 'border-[#F5C2CB]'
                    };

                    return (
                      <div
                        key={bottle.id}
                        onClick={() => onSelectBottle?.(bottle)}
                        className="bg-white border border-[#E6DFD5] hover:border-[#722F37]/50 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex flex-col justify-between group overflow-hidden"
                      >
                        {/* Top: Bottle image in an aspect-[3/4] rounded box with object-fit: contain and soft neutral background */}
                        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-[#F9F8F6] border border-[#E6DFD5] mb-2.5 flex items-center justify-center p-2.5">
                          {bottle.imageUrl ? (
                            <img
                              src={bottle.imageUrl}
                              alt={bottle.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Wine
                              size={40}
                              className="text-stone-300 group-hover:text-[#722F37]/60 transition-colors"
                              strokeWidth={1.2}
                            />
                          )}

                          {/* Floating badge: Wine classification */}
                          <span
                            className={`absolute top-2 left-2 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-xs ${typeConfig.border} ${typeConfig.bg} ${typeConfig.text}`}
                          >
                            {bottle.type}
                          </span>
                        </div>

                        {/* Body: Bottle name, vintage, producer, and price tag */}
                        <div className="space-y-1 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-baseline justify-between gap-1 mb-0.5">
                              <h5 className="font-serif font-bold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#722F37] transition-colors" title={bottle.name}>
                                {bottle.name}
                              </h5>
                              <span className="font-mono text-xs font-semibold text-[#800020] shrink-0">
                                {bottle.year || 'NV'}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-600 truncate font-medium">
                              {bottle.producer}
                            </p>
                          </div>

                          <div className="pt-2 mt-2 border-t border-[#F2EFE9] flex items-center justify-between">
                            {bottle.price ? (
                              <span className="font-mono text-xs font-bold text-stone-900">
                                ฿{bottle.price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400 font-sans italic">Reserve</span>
                            )}
                            <span className="text-[10px] font-semibold text-[#722F37] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              View <ChevronRight size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
