"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Music, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function ArtistsPage() {
  const { data: session, status } = useSession();
  const [artistsWithData, setArtistsWithData] = useState([]);

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once when authenticated and not already initialized
    if (status === "authenticated" && session?.user?.id && !hasInitialized) {
      initializeArtistsPage();
    } else if (status === "unauthenticated") {
      setHasInitialized(false);
    }
  }, [session, status, hasInitialized]);

  const initializeArtistsPage = async () => {
    try {
      console.log('Initializing artists page for user:', session.user.id);

      // Step 1: Fetch liked artists list
      const response = await fetch(`/api/liked-artists?userId=${session.user.id}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to fetch liked artists:', data.error);
        setArtistsWithData([]);
        setHasInitialized(true);
        return;
      }

      console.log('Found liked artists:', data.data.length);

      if (data.data.length === 0) {
        setArtistsWithData([]);
        setHasInitialized(true);
        return;
      }

      // Step 2: Fetch all artist details in parallel
      console.log('Fetching detailed data for all artists...');
      const artistPromises = data.data.map(async (likedArtist) => {
        try {
          const artistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists?id=${likedArtist.artistId}`);

          if (!artistResponse.ok) {
            throw new Error(`HTTP error! status: ${artistResponse.status}`);
          }

          const artistData = await artistResponse.json();
          const actualArtistData = artistData.success ? artistData.data : artistData;

          return {
            ...likedArtist,
            artistData: actualArtistData
          };
        } catch (error) {
          console.error(`Error fetching artist ${likedArtist.artistId}:`, error);
          return {
            ...likedArtist,
            artistData: null
          };
        }
      });

      // Wait for all artist data to be fetched
      const artistsWithFullData = await Promise.all(artistPromises);

      console.log('All artist data loaded successfully');
      setArtistsWithData(artistsWithFullData);
      setHasInitialized(true);

    } catch (error) {
      console.error('Error initializing artists page:', error);
      setArtistsWithData([]);
      setHasInitialized(true); // Mark as initialized even on error to prevent retry loops
    }
  };

  const toggleLike = async (artistId) => {
    try {
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          artistId: artistId
        })
      });

      const data = await response.json();
      if (data.success) {
        // Instead of re-initializing, just remove the artist from the current list
        setArtistsWithData(prev => prev.filter(artist => artist.artistId !== artistId));
      }
    } catch (error) {
      console.error('Error toggling artist like:', error);
    }
  };



  // Show sign-in screen only when definitely not authenticated
  if (status === "unauthenticated") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                    <BreadcrumbLink href="/music/library">Your Library</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Artists</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Sign in to view your favorite artists</h2>
            <p className="text-muted-foreground">Please sign in to see your liked artists.</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col"> 
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-3 md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/library">Your Library</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Artists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-3 md:p-6 pb-32 md:pb-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Favorite Artists</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {artistsWithData.length} artist{artistsWithData.length !== 1 ? 's' : ''} in your library
            </p>
          </div>

          {!hasInitialized ? (
            // Loading skeleton
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg"
                >
                  <div className="relative mb-3">
                    <div className="aspect-square rounded-full bg-muted animate-pulse"></div>
                  </div>
                  <div className="space-y-2 text-center">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-3/4 mx-auto animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : artistsWithData.length === 0 && hasInitialized ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No favorite artists yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring music and like your favorite artists to see them here.
                </p>
                <Link href="/music">
                  <Button>Discover Music</Button>
                </Link>
              </div>
            </div>
          ) : artistsWithData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {artistsWithData.map((artist) => {
                const artistData = artist.artistData;

                return (
                  <Link key={artist.artistId} href={`/music/artist/${artist.artistId}`} className="group cursor-pointer block">
                    <div className="p-3 rounded-lg hover:bg-muted/50 transition-all duration-200">
                      <div className="relative mb-3">
                        <div className="aspect-square rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 shadow-md group-hover:shadow-lg transition-shadow duration-200">
                          {artistData?.image?.length > 0 ? (
                            <img
                              src={artistData.image.find(img => img.quality === "500x500")?.url ||
                                artistData.image.find(img => img.quality === "150x150")?.url ||
                                artistData.image[0]?.url}
                              alt={artistData.name || 'Artist'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-8 h-8 text-white/60" />
                            </div>
                          )}
                        </div>

                        {/* Unlike button - always visible on mobile, hover on desktop */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8 p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLike(artist.artistId);
                          }}
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </Button>
                      </div>

                      <div className="space-y-1 text-center">
                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors duration-200">
                          {artistData?.name || `Artist ${artist.artistId}`}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {artistData?.dominantType || artistData?.type || 'Artist'}
                        </p>
                        {artistData?.followerCount && (
                          <p className="text-xs text-muted-foreground">
                            {artistData.followerCount.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}