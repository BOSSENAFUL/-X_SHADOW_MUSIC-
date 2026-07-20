"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppSidebar } from '@/components/app-sidebar';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Shield,
  Users,
  Search,
  ArrowLeft,
  Loader2,
  Lock,
  UserCheck,
  Clock,
  RefreshCw,
  X,
  Calendar as CalendarIcon,
  MapPin
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = useCallback(async (date) => {
    try {
      setRefreshing(true);
      const url = date ? `/api/admin/new-users?date=${date}` : '/api/admin/new-users';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch admin statistics');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchStats(selectedDate);
    }
  }, [status, session, selectedDate, fetchStats]);

  // Client-side date formatting helper to avoid hydration mismatches
  const formatDateTime = (dateString) => {
    if (!mounted) return '...';
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString) => {
    if (!mounted) return '...';
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    if (diffMs <= 0) return 'just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  // ── Render States ──────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  const isAuthorized = status === 'authenticated' && session?.user?.role === 'admin';
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground px-4">
        <Card className="max-w-md w-full text-center p-6 sm:p-8 border border-border shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Lock className="w-6 h-6" />
          </div>
          
          <div className="space-y-1 mb-6">
            <CardTitle className="text-xl font-semibold">Access Restricted</CardTitle>
            <CardDescription className="text-sm">
              You must be logged in as an administrator to access this area.
            </CardDescription>
          </div>

          <Button variant="default" className="w-full" onClick={() => router.push('/music')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to App
          </Button>
        </Card>
      </div>
    );
  }

  const usersList = data?.users || [];
  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-x-hidden h-svh flex flex-col bg-background">
        {/* Header Navigation (Desktop) */}
        <header className="sticky top-0 z-40 hidden md:flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Admin Panel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 text-xs font-medium" 
              onClick={() => fetchStats(selectedDate)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-8 space-y-3.5 sm:space-y-6 pb-36">
            
            {/* Mobile Header Bar (< 640px) */}
            <div className="flex sm:hidden items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shrink-0" 
                  onClick={() => router.push('/music')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-base font-bold text-foreground leading-none">Admin Overview</h1>
                  <p className="text-[11px] text-muted-foreground mt-0.5">User Signups & Analytics</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground" 
                onClick={() => fetchStats(selectedDate)}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Desktop Title Header (>= 640px) */}
            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  User Signups Overview
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Track daily user registrations, locations, and historical growth metrics.
                </p>
              </div>
            </div>

            {/* Mobile KPI Summary (Compact 3-Column Strip on Mobile < 640px) */}
            {loadingStats ? (
              <div className="grid gap-2 grid-cols-3 sm:hidden">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-muted/20 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                <div className="bg-card/70 border border-border/60 rounded-xl p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Signups</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-foreground">{data?.count ?? 0}</span>
                    <span className="text-[10px] text-muted-foreground">24h</span>
                  </div>
                </div>

                <div className="bg-card/70 border border-border/60 rounded-xl p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Total</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-foreground">{data?.totalUsers ? data.totalUsers.toLocaleString() : 0}</span>
                  </div>
                </div>

                <div className="bg-card/70 border border-border/60 rounded-xl p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Range</span>
                  <span className="text-xs font-semibold text-foreground truncate mt-1">
                    {selectedDate ? selectedDate : 'Last 24h'}
                  </span>
                </div>
              </div>
            )}

            {/* Desktop KPI Cards Grid (>= 640px) */}
            {loadingStats ? (
              <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="h-24 animate-pulse bg-muted/20" />
                ))}
              </div>
            ) : error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 text-destructive text-xs sm:text-sm font-medium">
                  {error}
                </CardContent>
              </Card>
            ) : (
              <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Daily / Selected Date Signups */}
                <Card className="border border-border/80 shadow-none bg-card/60">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {selectedDate ? 'Signups on Date' : 'New Signups'}
                      </span>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-foreground">{data?.count ?? 0}</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedDate ? `users` : `in 24h`}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{selectedDate ? `Filter: ${selectedDate}` : 'Rolling 24-hour window'}</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Total System Users */}
                <Card className="border border-border/80 shadow-none bg-card/60">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Accounts</span>
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        {data?.totalUsers ? data.totalUsers.toLocaleString() : 0}
                      </span>
                      <span className="text-xs text-muted-foreground">registered</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">All-time database records</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Query Horizon */}
                <Card className="border border-border/80 shadow-none bg-card/60 sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Query Window</span>
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 space-y-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground block truncate">
                        {selectedDate ? selectedDate : 'Last 24 Hours'}
                      </span>
                      <span className="text-xs text-muted-foreground block truncate">
                        {selectedDate ? (
                          `Starting ${formatDateTime(new Date(selectedDate))}`
                        ) : (
                          `From ${formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}`
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Mobile Toolbar & Filter Actions (< 640px) */}
            <div className="flex sm:hidden flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search user, email, city..." 
                    className="pl-8 pr-7 h-9 text-xs bg-card/60 border-border/80 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-xl shrink-0 bg-card/60 border-border/80 relative",
                        selectedDate && "text-primary border-primary/50 bg-primary/10"
                      )}
                      title="Filter by date"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {selectedDate && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-popover border-border" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate ? new Date(selectedDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          setSelectedDate(`${year}-${month}-${day}`);
                        } else {
                          setSelectedDate('');
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Active Filter Chips (Mobile) */}
              {selectedDate && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[11px] gap-1 bg-primary/10 text-primary border border-primary/20 py-0.5 px-2 rounded-lg">
                    <span>Date: {format(new Date(selectedDate), "MMM d, yyyy")}</span>
                    <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => setSelectedDate('')} />
                  </Badge>
                </div>
              )}
            </div>

            {/* Mobile Data List View (< 640px) */}
            <div className="block sm:hidden">
              {loadingStats ? (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-20 bg-muted/20 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 bg-card/40 border border-border/60 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No registrations found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {searchQuery 
                        ? `No signups matching "${searchQuery}".` 
                        : selectedDate 
                          ? `No user accounts registered on ${selectedDate}.` 
                          : "No new user accounts registered in the last 24 hours."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
                    <span>Registrations ({filteredUsers.length})</span>
                    <span>Sorted by newest</span>
                  </div>
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="p-3.5 rounded-2xl bg-card/70 border border-border/70 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 rounded-full border border-border/80 shrink-0">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {user.name || 'Anonymous User'}
                              </span>
                              {user.role === 'admin' && (
                                <Badge variant="outline" className="text-[9px] font-medium border-amber-500/30 text-amber-500 bg-amber-500/10 py-0 px-1.5 h-4 shrink-0">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {user.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                              Unverified
                            </span>
                          )}

                          {user.location && user.location !== 'Unknown' && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[130px]" title={user.location}>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{user.location}</span>
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          {getRelativeTime(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Section Card & Full Table (>= 640px) */}
            <Card className="hidden sm:block border border-border/80 shadow-none bg-card/60 overflow-hidden">
              <CardHeader className="p-5 border-b border-border/60 bg-muted/10 space-y-0">
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {selectedDate ? `Registrations (${selectedDate})` : 'Recent Registrations'}
                    </h2>
                    {data?.count !== undefined && (
                      <Badge variant="secondary" className="font-medium text-xs px-2 py-0.5 rounded-full">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                      </Badge>
                    )}
                  </div>

                  {/* Desktop Toolbar Filter controls */}
                  <div className="flex flex-row items-center gap-2.5">
                    {/* Date Picker Popover */}
                    <div className="relative w-44">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 text-xs font-normal justify-start w-full bg-background border-border pr-8",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {selectedDate ? format(new Date(selectedDate), "MMM d, yyyy") : "Pick a date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-popover border-border" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDate ? new Date(selectedDate) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setSelectedDate(`${year}-${month}-${day}`);
                              } else {
                                setSelectedDate('');
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {selectedDate && (
                        <button
                          onClick={() => setSelectedDate('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 p-0.5 rounded-full hover:bg-muted transition-colors"
                          title="Clear date filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-60">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        type="text" 
                        placeholder="Search user, email, city..." 
                        className="pl-8 pr-7 h-8 text-xs bg-background border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingStats ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="h-10 bg-muted/20 rounded-md animate-pulse" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">No registrations found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery 
                          ? `No signups matching "${searchQuery}".` 
                          : selectedDate 
                            ? `No user accounts registered on ${selectedDate}.` 
                            : "No new user accounts registered in the last 24 hours."}
                      </p>
                    </div>
                    {(searchQuery || selectedDate) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs mt-2"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedDate('');
                        }}
                      >
                        Reset filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table className="w-full">
                    <TableHeader className="bg-muted/20 border-b border-border/60">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">User</TableHead>
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">Role</TableHead>
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">Status</TableHead>
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">Location</TableHead>
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">Joined</TableHead>
                        <TableHead className="py-3 px-5 text-xs font-medium text-muted-foreground whitespace-nowrap">Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id} 
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 rounded-full border border-border/60 shrink-0">
                                <AvatarImage src={user.image} alt={user.name} />
                                <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-foreground truncate max-w-[180px] lg:max-w-[220px]">
                                  {user.name || 'Anonymous User'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[180px] lg:max-w-[220px]">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            {user.role === 'admin' ? (
                              <Badge variant="outline" className="text-[11px] font-medium border-amber-500/30 text-amber-500 bg-amber-500/10 py-0 h-5">
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] font-medium border-border/80 text-muted-foreground py-0 h-5">
                                User
                              </Badge>
                            )}
                          </TableCell>
                          
                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            {user.isVerified ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                Unverified
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            {user.location && user.location !== 'Unknown' ? (
                              <div className="flex items-center gap-1.5 text-xs text-foreground/90 max-w-[160px] truncate" title={user.location}>
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{user.location}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">—</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">
                                {getRelativeTime(user.createdAt)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateTime(user.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-3 px-5 whitespace-nowrap">
                            {getRelativeTime(user.lastActive) ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">
                                  {getRelativeTime(user.lastActive)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDateTime(user.lastActive)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
