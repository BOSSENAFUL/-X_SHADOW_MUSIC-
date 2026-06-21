"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Search, Music, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GenresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch genres from Playlists DB
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/genres");
        if (!res.ok) throw new Error("Failed to fetch genres");
        const data = await res.json();
        if (data.success) {
          setGenres(data.data);
        } else {
          throw new Error(data.error || "Failed to load genres data");
        }
      } catch (err) {
        console.error("Error fetching genres:", err);
        setError(err.message || "An error occurred while loading genres");
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  // Filter genres based on search term
  const filteredGenres = useMemo(() => {
    if (!searchTerm.trim()) {
      return genres;
    }
    return genres.filter((genre) =>
      genre.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genres, searchTerm]);

  const handleGenreClick = (genreId) => {
    router.push(`/music/discover/genres/${genreId}`);
  };

  const isGradient = (colorStr) => {
    return colorStr && (colorStr.includes("from-") || colorStr.includes("to-") || colorStr.includes("via-"));
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/discover">Discover</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Genres</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 tracking-tight">Browse Genres</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Discover music by your favorite genres
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/60 dark:text-black/60 z-10" />
              <Input
                placeholder="What do you want to listen to?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 w-full bg-white dark:bg-white text-black dark:text-black placeholder:text-black/50 dark:placeholder:text-black/50 rounded-lg border-0 text-base font-semibold shadow-md transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>
            {searchTerm && !loading && !error && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredGenres.length} genre{filteredGenres.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="max-w-md mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading Skeletons */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4 pb-24">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[1.45] rounded-xl bg-muted/20 animate-pulse relative overflow-hidden shadow-sm">
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 w-[60%] h-4 sm:h-5 bg-muted/40 rounded" />
                  <div className="absolute right-0 bottom-0 w-[46%] sm:w-[48%] aspect-square translate-x-[20%] sm:translate-x-[24%] translate-y-[10%] sm:translate-y-[14%] rotate-[25deg] bg-muted/30 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredGenres.length > 0 ? (
            /* Genres Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4 pb-24">
              {filteredGenres.map((genre) => (
                <div
                  key={genre._id}
                  className={`relative aspect-[1.45] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-md flex flex-col justify-between group ${
                    isGradient(genre.color) ? `bg-gradient-to-br ${genre.color}` : ""
                  }`}
                  style={!isGradient(genre.color) ? { backgroundColor: genre.color || "#121212" } : {}}
                  onClick={() => handleGenreClick(genre._id)}
                >
                  {/* Genre Name */}
                  <div className="p-3 sm:p-4 flex-1">
                    <h3 className="text-white font-extrabold text-sm md:text-base lg:text-lg tracking-tight leading-tight break-words max-w-[78%] drop-shadow-md">
                      {genre.name}
                    </h3>
                  </div>

                  {/* Tilted Cover Art Image */}
                  <div className="absolute right-0 bottom-0 w-[46%] sm:w-[48%] aspect-square translate-x-[20%] sm:translate-x-[24%] translate-y-[10%] sm:translate-y-[14%] rotate-[25deg] shadow-[-4px_4px_12px_rgba(0,0,0,0.5)] overflow-hidden rounded-md shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-[14%] sm:group-hover:translate-x-[18%] group-hover:translate-y-[5%] sm:group-hover:translate-y-[8%]">
                    {genre.coverImage ? (
                      <img
                        src={genre.coverImage}
                        alt={genre.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-black/30 flex items-center justify-center">
                        <Music className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No genres found</h3>
              <p className="text-muted-foreground">
                Try searching for a different genre name
              </p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
