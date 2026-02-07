"use client";

import { useState, useRef, useEffect, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

// US States TopoJSON - using a CDN for reliability
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// State abbreviation to full name mapping
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

// Reverse mapping: full name to abbreviation
const STATE_ABBREVS: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([abbr, name]) => [name, abbr])
);

interface StateData {
  name: string; // Could be abbreviation or full name
  count: number;
}

interface USHeatmapProps {
  data: StateData[];
}

// Color interpolation from FIJI Gold to FIJI Purple
function getStateColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "#e5e7eb"; // gray-200

  const intensity = Math.min(count / maxCount, 1);

  // Interpolate between FIJI Gold (#C4A747) and FIJI Purple (#3D1F6F)
  // Using a stepped gradient for clearer visual distinction
  if (intensity < 0.2) return "#f5efc7"; // very light gold
  if (intensity < 0.4) return "#C4A747"; // FIJI gold
  if (intensity < 0.6) return "#9a7d5a"; // gold-purple mix
  if (intensity < 0.8) return "#6b4d8a"; // light purple
  return "#3D1F6F"; // FIJI purple
}

function USHeatmapComponent({ data }: USHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipContent, setTooltipContent] = useState<{
    name: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Dismiss tooltip when tapping outside the map on mobile
  useEffect(() => {
    function handleTouchOutside(e: TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltipContent(null);
      }
    }
    document.addEventListener("touchstart", handleTouchOutside);
    return () => document.removeEventListener("touchstart", handleTouchOutside);
  }, []);

  // Normalize data: convert abbreviations to full names if needed
  const normalizedData = new Map<string, number>();
  data.forEach((item) => {
    // Check if it's an abbreviation
    const fullName = STATE_NAMES[item.name.toUpperCase()] || item.name;
    normalizedData.set(fullName, item.count);
  });

  // Find max count for color scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Get count for a state (handles both TopoJSON names and our data)
  const getCount = (stateName: string): number => {
    // Try direct match first
    if (normalizedData.has(stateName)) {
      return normalizedData.get(stateName) || 0;
    }
    // Try abbreviation lookup
    const abbr = STATE_ABBREVS[stateName];
    if (abbr && normalizedData.has(abbr)) {
      return normalizedData.get(abbr) || 0;
    }
    return 0;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Map */}
      <div className="relative">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name;
                  const count = getCount(stateName);
                  const color = getStateColor(count, maxCount);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          outline: "none",
                          fill: count > 0 ? "#2d1654" : "#d1d5db",
                          cursor: "pointer",
                        },
                        pressed: { outline: "none" },
                      }}
                      onClick={(evt) => {
                        // Touch/click support for mobile
                        const { clientX, clientY } = evt;
                        setTooltipContent((prev) =>
                          prev?.name === stateName
                            ? null
                            : { name: stateName, count, x: clientX, y: clientY }
                        );
                      }}
                      onMouseEnter={(evt) => {
                        const { clientX, clientY } = evt;
                        setTooltipContent({
                          name: stateName,
                          count,
                          x: clientX,
                          y: clientY,
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltipContent(null);
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="fixed z-50 px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md shadow-lg border pointer-events-none"
            style={{
              left: tooltipContent.x + 10,
              top: tooltipContent.y - 40,
            }}
          >
            <p className="font-semibold">{tooltipContent.name}</p>
            <p className="text-muted-foreground">
              {tooltipContent.count === 0
                ? "No brothers"
                : tooltipContent.count === 1
                ? "1 brother"
                : `${tooltipContent.count} brothers`}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Fewer</span>
        <div className="flex h-3">
          <div className="w-6 bg-[#f5efc7] rounded-l" />
          <div className="w-6 bg-[#C4A747]" />
          <div className="w-6 bg-[#9a7d5a]" />
          <div className="w-6 bg-[#6b4d8a]" />
          <div className="w-6 bg-[#3D1F6F] rounded-r" />
        </div>
        <span>More</span>
        <span className="ml-2 text-gray-400">|</span>
        <div className="w-4 h-3 bg-[#e5e7eb] rounded" />
        <span>None</span>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const USHeatmap = memo(USHeatmapComponent);
