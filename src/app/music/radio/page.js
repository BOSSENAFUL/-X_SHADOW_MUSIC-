"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Radio,
  Search,
  MapPin,
  Play,
  Pause,
  Volume2,
  Globe,
  Filter,
  Heart,
  ExternalLink,
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
// Function to decode HTML entities
const decodeHtmlEntities = (text) => {
  if (typeof document === 'undefined') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const RADIO_API_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info"
];

const fetchFromRadioBrowser = async (path) => {
  let lastError = null;
  for (const server of RADIO_API_SERVERS) {
    try {
      const response = await fetch(`${server}${path}`, {
        headers: {
          'User-Agent': 'Jammify/1.0'
        }
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (err) {
      console.warn(`Radio API server ${server} failed:`, err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Radio API servers failed");
};

const RadioMap = dynamic(() => import("@/components/radio-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        <p>Loading radio stations map...</p>
      </div>
    </div>
  ),
});

export default function RadioPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [tags, setTags] = useState([]);
  const [currentStation, setCurrentStation] = useState(null);
  const [viewMode, setViewMode] = useState("map"); // "map" or "list"
  const [visibleCount, setVisibleCount] = useState(60);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Reset visible count when search or filters change
  useEffect(() => {
    setVisibleCount(60);
  }, [searchTerm, selectedCountry, selectedLanguage, selectedTag]);

  const { playSong, currentSong, isPlayerVisible, isPlaying } = useMusicPlayer();


  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        const cacheKey = "radio_data_cache_v2";
        const cacheTimeKey = "radio_data_cache_time_v2";
        const cachedStr = sessionStorage.getItem(cacheKey);
        const cacheTimeStr = sessionStorage.getItem(cacheTimeKey);

        // Use cache if it exists and is less than 6 hours old
        if (cachedStr && cacheTimeStr) {
          const cachedTime = parseInt(cacheTimeStr, 10);
          if (Date.now() - cachedTime < 6 * 60 * 60 * 1000) {
            const cachedData = JSON.parse(cachedStr);
            setStations(cachedData.stations);
            setCountries(cachedData.countries);
            setLanguages(cachedData.languages);
            setTags(cachedData.tags);
            setLoading(false);
            return;
          }
        }
        
        // Fetch all initial metadata and search entries in parallel
        const [stationsData, countriesData, languagesData, tagsData] = await Promise.all([
          fetchFromRadioBrowser("/json/stations/search?limit=2500&has_geo_info=true&hidebroken=true&order=clickcount&reverse=true"),
          fetchFromRadioBrowser("/json/countries?hidebroken=true"),
          fetchFromRadioBrowser("/json/languages?hidebroken=true&order=stationcount&reverse=true"),
          fetchFromRadioBrowser("/json/tags?hidebroken=true&order=stationcount&reverse=true")
        ]);
        
        // Filter stations with valid coordinates
        const validStations = stationsData.filter(
          station => station.geo_lat && station.geo_long && 
          station.geo_lat !== 0 && station.geo_long !== 0 &&
          station.lastcheckok === 1
        );
        
        setStations(validStations);

        // Fetch countries
        const validCountries = countriesData.filter(
          country => country && typeof country.name === 'string' && country.name.trim() !== ""
        );
        const sortedCountries = validCountries.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sortedCountries); // Show all countries, sorted alphabetically

        // Filter for clean language names and sort by popularity
        const topLanguages = languagesData
          .filter(lang => lang && typeof lang.name === 'string' && /^[a-zA-Z\s-]+$/.test(lang.name)) // Only alphabetic names
          .slice(0, 80);
        setLanguages(topLanguages); 

        // Filter for clean genre names
        const topTags = tagsData
          .filter(tag => tag && typeof tag.name === 'string' && tag.name.length > 2 && /^[a-zA-Z\s-]+$/.test(tag.name))
          .slice(0, 80);
        setTags(topTags); 

        try {
          // Save to cache
          sessionStorage.setItem(cacheKey, JSON.stringify({
            stations: validStations,
            countries: sortedCountries,
            languages: topLanguages,
            tags: topTags
          }));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          console.warn("Could not cache radio data (quota exceeded)");
        }
      } catch (error) {
        console.error("Error fetching radio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // On-demand fetching when filters change to ensure we have data for the selection
  useEffect(() => {
    if (selectedCountry === "all" && selectedLanguage === "all" && selectedTag === "all") return;

    const fetchFilteredData = async () => {
      try {
        let queryParams = "?limit=500&has_geo_info=true&hidebroken=true&order=clickcount&reverse=true";
        
        if (selectedCountry !== "all") {
          // Send both name and try to remove "The" prefix for API search
          const cleanCountry = selectedCountry.toLowerCase().startsWith("the ") ? selectedCountry.slice(4) : selectedCountry;
          queryParams += `&country=${encodeURIComponent(cleanCountry)}`;
        }
        
        if (selectedLanguage !== "all") queryParams += `&language=${encodeURIComponent(selectedLanguage)}`;
        if (selectedTag !== "all") queryParams += `&tag=${encodeURIComponent(selectedTag)}`;

        const data = await fetchFromRadioBrowser(`/json/stations/search${queryParams}`);
        
        const validNewStations = data.filter(
          station => station.geo_lat && station.geo_long && 
          station.geo_lat !== 0 && station.geo_long !== 0 &&
          station.lastcheckok === 1
        );

        if (validNewStations.length > 0) {
          setStations(prev => {
            const existingIds = new Set(prev.map(s => s.stationuuid));
            const uniqueNewStations = validNewStations.filter(s => !existingIds.has(s.stationuuid));
            if (uniqueNewStations.length === 0) return prev;
            return [...prev, ...uniqueNewStations];
          });
        }
      } catch (error) {
        console.error("Error fetching filtered data:", error);
      }
    };

    const timeoutId = setTimeout(fetchFilteredData, 300); // Debounce to prevent rapid API calls
    return () => clearTimeout(timeoutId);
  }, [selectedCountry, selectedLanguage, selectedTag]);

  // Filter stations based on search criteria
  const filteredStations = useMemo(() => {
    let filtered = stations;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(station =>
        (station.name && station.name.toLowerCase().includes(term)) ||
        (station.tags && station.tags.toLowerCase().includes(term)) ||
        (station.country && station.country.toLowerCase().includes(term))
      );
    }

    if (selectedCountry && selectedCountry !== "all") {
      const search = selectedCountry.toLowerCase().trim();
      // Heuristic: remove "the " prefix for better matching
      const cleanSearch = search.startsWith("the ") ? search.slice(4) : search;
      
      filtered = filtered.filter(station => {
        const country = (station.country || "").toLowerCase();
        const code = (station.countrycode || "").toLowerCase();
        return country === search || 
               country === cleanSearch || 
               code === search || 
               country.includes(cleanSearch) || 
               cleanSearch.includes(country);
      });
    }

    if (selectedLanguage && selectedLanguage !== "all") {
      const search = selectedLanguage.toLowerCase().trim();
      filtered = filtered.filter(station =>
        station.language && station.language.toLowerCase().includes(search)
      );
    }

    if (selectedTag && selectedTag !== "all") {
      const search = selectedTag.toLowerCase().trim();
      filtered = filtered.filter(station =>
        station.tags && station.tags.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [searchTerm, selectedCountry, selectedLanguage, selectedTag, stations]);

  const handleStationPlay = useCallback(async (station) => {
    try {
      // Click counter for the station and get the proper stream URL
      const clickData = await fetchFromRadioBrowser(`/json/url/${station.stationuuid}`);
      
      // Use the URL from the click response or fallback to station URL
      const streamUrl = clickData.url || station.url_resolved || station.url;
      
      // Helper to map station to player format
      const mapStationToSong = (s, resolvedUrl = null) => ({
        id: s.stationuuid,
        name: decodeHtmlEntities(s.name),
        artists: { primary: [{ name: s.country || "Radio Station" }] },
        album: { name: s.tags || "Live Radio" },
        duration: 0,
        image: s.favicon ? [{ url: s.favicon, quality: "150x150" }] : [],
        downloadUrl: [
          { url: resolvedUrl || s.url_resolved || s.url, quality: "320kbps" },
          { url: resolvedUrl || s.url_resolved || s.url, quality: "stream" }
        ],
        isRadio: true,
      });

      const radioSong = mapStationToSong(station, streamUrl);
      
      // Map all filtered stations to create a playable queue
      // Including all ensures the next/previous buttons are always active
      const queue = filteredStations.map(s => 
        s.stationuuid === station.stationuuid ? radioSong : mapStationToSong(s)
      );

      // Pass a unique context ID for the radio session
      playSong(radioSong, queue, "radio-global");
      setCurrentStation(station);
      
      console.log("Playing radio station:", station.name, "URL:", streamUrl);
    } catch (error) {
      console.error("Error playing radio station:", error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'Failed to play radio station. Please try another one.';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }
  }, [playSong, filteredStations]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedLanguage("all");
    setSelectedTag("all");
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Radio</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-48" />
              <div className="h-[600px] bg-muted rounded-lg" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-3 md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Radio</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6 pb-32 max-h-[calc(100vh-64px)] overflow-y-auto">


          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Radio className="w-8 h-8" />
                Radio Stations
              </h1>
              <p className="text-muted-foreground">
                Discover radio stations from around the world
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("map")}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <Radio className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader 
              className="cursor-pointer md:cursor-default select-none" 
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <span className="text-xs text-muted-foreground md:hidden border border-muted px-2.5 py-1 rounded-full bg-muted/20">
                  {showFiltersMobile ? "Tap to collapse" : "Tap to expand"}
                </span>
              </div>
              <CardDescription className="hidden md:block mt-1.5">
                Filter radio stations by location, language, or genre
              </CardDescription>
            </CardHeader>
            <CardContent className={showFiltersMobile ? "block" : "hidden md:block"}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.filter(c => c && c.name && c.name.trim() !== "").map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages</SelectItem>
                      {languages.filter(l => l && l.name && l.name.trim() !== "").map((language) => (
                        <SelectItem key={language.name} value={language.name}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genres</SelectItem>
                      {tags.filter(t => t && t.name && t.name.trim() !== "").map((tag) => (
                        <SelectItem key={tag.name} value={tag.name}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredStations.length} stations
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {viewMode === "map" ? (
            <Card className="mb-20">
              <CardContent className="p-0">
                <div className="h-[360px] md:h-[calc(100vh-360px)] min-h-[300px] md:min-h-[400px] max-h-[calc(100vh-360px)] overflow-hidden relative">
                  <RadioMap 
                    stations={filteredStations} 
                    onStationClick={handleStationPlay}
                    currentStation={currentStation}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 mb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.slice(0, visibleCount).map((station) => (
                  <Card key={station.stationuuid} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {station.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {station.country}
                            {station.state && `, ${station.state}`}
                          </CardDescription>
                        </div>
                        {station.favicon && (
                          <img
                            src={station.favicon}
                            alt={station.name}
                            className="w-8 h-8 rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {station.tags && (
                          <div className="flex flex-wrap gap-1">
                            {station.tags.split(',').slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{station.codec} • {station.bitrate}kbps</span>
                          <span>{station.clickcount} listeners</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStationPlay(station)}
                            className="flex-1"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                          {station.homepage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(station.homepage, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {visibleCount < filteredStations.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((prev) => prev + 60)}
                    className="rounded-full px-8 py-2 border-muted-foreground/30 hover:bg-muted/50 transition-colors"
                  >
                    Load More Stations
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
