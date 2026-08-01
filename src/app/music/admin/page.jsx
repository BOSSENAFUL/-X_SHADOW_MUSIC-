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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  MapPin,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles,
  Filter
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = useCallback(async (dateFilter = '', monthFilter = '') => {
    try {
      setRefreshing(true);
      let url = '/api/admin/new-users';
      if (monthFilter) {
        url = `/api/admin/new-users?month=${monthFilter}`;
      } else if (dateFilter) {
        url = `/api/admin/new-users?date=${dateFilter}`;
      }
      
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
      fetchStats(selectedDate, selectedMonth);
    }
  }, [status, session, selectedDate, selectedMonth, fetchStats]);

  const handleSelectDate = (dateStr) => {
    setSelectedMonth(''); // Mutually exclusive filter for clarity
    setSelectedDate(dateStr);
  };

  const handleSelectMonth = (monthStr) => {
    setSelectedDate(''); // Mutually exclusive filter for clarity
    if (monthStr === '24h_reset' || !monthStr) {
      setSelectedMonth('');
    } else {
      setSelectedMonth(monthStr);
    }
  };

  const handleClearFilters = () => {
    setSelectedDate('');
    setSelectedMonth('');
    setSearchQuery('');
  };

  // Client-side date formatting helper to avoid hydration mismatches
  const formatDateTime = (dateString) => {
    if (!mounted) return '...';
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
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
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - date;
    
    if (diffMs <= 0) return 'just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;

    // Accurate month calculation
    const yearDiff = now.getFullYear() - date.getFullYear();
    const monthDiff = (yearDiff * 12) + (now.getMonth() - date.getMonth());

    if (monthDiff <= 1) return 'last month';
    if (monthDiff < 12) return `${monthDiff} months ago`;
    
    if (yearDiff <= 1) return '1 year ago';
    return `${yearDiff} years ago`;
  };

  // ── Render Access Restrictions ─────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Loading admin session...</p>
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

  const stats = data?.stats || {};
  const monthlyBreakdown = data?.monthlyBreakdown || [];

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-x-hidden h-svh flex flex-col bg-background">
        
        {/* Unified Responsive Sticky Header Navigation */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1 h-8 w-8 shrink-0" />
            <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 shrink-0" />
            
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap truncate">
                <BreadcrumbItem className="hidden xs:inline-flex">
                  <BreadcrumbLink href="/music" className="text-xs sm:text-sm">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden xs:inline-flex" />
                <BreadcrumbItem className="min-w-0 truncate">
                  <BreadcrumbPage className="font-semibold text-xs sm:text-sm truncate">Admin Panel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2.5 sm:px-3 gap-1.5 text-xs font-medium" 
              onClick={() => fetchStats(selectedDate, selectedMonth)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Analytics</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </header>

        {/* Main Scroll Container */}
        <ScrollArea className="flex-1">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-28">
            
            {/* Responsive Page Title & Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-tight min-w-0">
                    User Analytics & Registration Stats
                  </h1>
                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/10 border-primary/20 text-primary px-2 py-0.5 font-medium shrink-0">
                    Live DB Metrics
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-normal">
                  Track monthly signups, rolling 30-day growth, daily registrations, and user activity.
                </p>
              </div>
            </div>

            {/* ERROR ALERT DISPLAY */}
            {error && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3.5 text-destructive text-xs sm:text-sm font-medium flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </CardContent>
              </Card>
            )}

            {/* KPI CARDS GRID (Fully Responsive: 1 col on <480px, 2 col on <1024px, 4 col on 1024px+) */}
            {loadingStats ? (
              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="h-28 animate-pulse bg-muted/20 border-border/40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
                
                {/* 1. Monthly New Users (CURRENT CALENDAR MONTH) */}
                <Card className="border border-border/80 shadow-none bg-gradient-to-br from-card/90 via-card/60 to-primary/5 relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        New Users This Month
                      </span>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {stats.thisMonthCount !== undefined ? stats.thisMonthCount.toLocaleString() : 0}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {stats.currentMonthLabel || 'this month'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs flex items-center gap-1.5 flex-wrap">
                      {stats.monthGrowthPercent !== undefined && stats.monthGrowthPercent !== 0 ? (
                        stats.monthGrowthPercent > 0 ? (
                          <span className="inline-flex items-center text-emerald-500 font-semibold gap-0.5 text-xs">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{stats.monthGrowthPercent}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-amber-500 font-semibold gap-0.5 text-xs">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {stats.monthGrowthPercent}%
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">Month-to-date total</span>
                      )}
                      <span className="text-muted-foreground/70 text-[11px] truncate">
                        (vs {stats.lastMonthCount?.toLocaleString() || 0} last mo)
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Rolling 30-Day Signups */}
                <Card className="border border-border/80 shadow-none bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Last 30 Days Signups
                      </span>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {stats.last30DaysCount !== undefined ? stats.last30DaysCount.toLocaleString() : 0}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">users</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Rolling 30-day window</span>
                    </p>
                  </CardContent>
                </Card>

                {/* 3. Total Registered Accounts */}
                <Card className="border border-border/80 shadow-none bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Total Registered
                      </span>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {data?.totalUsers ? data.totalUsers.toLocaleString() : 0}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">accounts</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">All-time DB total</span>
                    </p>
                  </CardContent>
                </Card>

                {/* 4. Active Filter Selection Count */}
                <Card className="border border-border/80 shadow-none bg-card/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        Query Results
                      </span>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {data?.count ?? 0}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">signups</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground truncate font-medium">
                      Filter: <span className="text-foreground">{data?.timeLabel || 'Last 24 Hours'}</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* MONTHLY REGISTRATION TRENDS & RESPONSIVE GRID BREAKDOWN */}
            {!loadingStats && monthlyBreakdown.length > 0 && (
              <Card className="border border-border/80 shadow-none bg-card/50 overflow-hidden">
                <CardHeader className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 border-b border-border/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                        Monthly User Registrations Breakdown
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Tap any month to filter the user signups list below.
                      </CardDescription>
                    </div>
                    {(selectedMonth || selectedDate) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs gap-1.5 self-start sm:self-auto text-primary hover:text-primary px-2"
                        onClick={handleClearFilters}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reset Filter (24h)
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4">
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                    {monthlyBreakdown.map((item) => {
                      const isSelected = selectedMonth === item.monthKey;
                      const isCurrent = stats.currentMonthKey === item.monthKey;
                      return (
                        <button
                          key={item.monthKey}
                          onClick={() => handleSelectMonth(item.monthKey)}
                          className={cn(
                            "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all w-full min-w-0",
                            isSelected 
                              ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                              : "bg-background/80 hover:bg-muted border-border/70 text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between w-full gap-1 min-w-0">
                            <span className={cn("text-[11px] sm:text-xs font-medium truncate", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                              {item.label}
                            </span>
                            {isCurrent && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-primary-foreground" : "bg-primary")} />
                            )}
                          </div>
                          <span className="text-sm sm:text-base font-bold tracking-tight mt-1 truncate w-full">
                            {item.count.toLocaleString()} <span className="text-[10px] font-normal opacity-80">users</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FILTER & SEARCH TOOLBAR (Responsive 2-Row on Mobile, 1-Row on Desktop) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/40 border border-border/70 rounded-2xl p-3">
              
              {/* Active Filter Badges */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                  Filter:
                </span>
                
                {selectedMonth ? (
                  <Badge variant="secondary" className="text-xs gap-1.5 bg-primary/10 text-primary border border-primary/20 py-0.5 px-2.5 rounded-lg">
                    <span>Month: {data?.timeLabel || selectedMonth}</span>
                    <X className="w-3.5 h-3.5 cursor-pointer hover:text-foreground" onClick={() => setSelectedMonth('')} />
                  </Badge>
                ) : selectedDate ? (
                  <Badge variant="secondary" className="text-xs gap-1.5 bg-primary/10 text-primary border border-primary/20 py-0.5 px-2.5 rounded-lg">
                    <span>Date: {format(new Date(selectedDate), "MMM d, yyyy")}</span>
                    <X className="w-3.5 h-3.5 cursor-pointer hover:text-foreground" onClick={() => setSelectedDate('')} />
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border/80 py-0.5 px-2.5 rounded-lg">
                    <span>Range: Last 24 Hours</span>
                  </Badge>
                )}

                {searchQuery && (
                  <Badge variant="secondary" className="text-xs gap-1.5 bg-muted text-foreground border border-border/80 py-0.5 px-2.5 rounded-lg">
                    <span>Search: "{searchQuery}"</span>
                    <X className="w-3.5 h-3.5 cursor-pointer hover:text-foreground" onClick={() => setSearchQuery('')} />
                  </Badge>
                )}
              </div>

              {/* Controls Row (Search Box + Month Dropdown + Date Picker) */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                
                {/* Search Box */}
                <div className="relative flex-1 xs:w-48 sm:w-56 min-w-0">
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
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Actions Sub-Row (Month Select + Date Picker) */}
                <div className="flex items-center gap-2">
                  {monthlyBreakdown.length > 0 && (
                    <div className="flex-1 xs:w-36">
                      <Select value={selectedMonth || "24h_reset"} onValueChange={(val) => handleSelectMonth(val)}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border w-full">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover border-border max-h-60 overflow-y-auto">
                          <SelectItem value="24h_reset">Rolling 24h</SelectItem>
                          {monthlyBreakdown.map((m) => (
                            <SelectItem key={m.monthKey} value={m.monthKey}>
                              {m.label} ({m.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs font-normal justify-start bg-background border-border shrink-0",
                          selectedDate && "text-primary border-primary/50 bg-primary/10"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedDate ? format(new Date(selectedDate), "MMM d") : "Pick Date"}
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
                            handleSelectDate(`${year}-${month}-${day}`);
                          } else {
                            setSelectedDate('');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

              </div>
            </div>

            {/* MOBILE / SMALL TABLET CARDS VIEW (< 768px) */}
            <div className="block md:hidden">
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
                    <p className="text-sm font-medium text-foreground">No user registrations found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {searchQuery 
                        ? `No signups matching "${searchQuery}".` 
                        : data?.timeLabel 
                          ? `No user accounts registered during ${data.timeLabel}.` 
                          : "No new user accounts registered in this period."}
                    </p>
                  </div>
                  {(selectedDate || selectedMonth || searchQuery) && (
                    <Button variant="outline" size="sm" className="h-8 text-xs mt-1" onClick={handleClearFilters}>
                      Clear all active filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
                    <span>Registrations ({filteredUsers.length})</span>
                    <span>Newest first</span>
                  </div>
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="p-3.5 rounded-2xl bg-card/70 border border-border/70 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border/80 shrink-0">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                {user.name || 'Anonymous User'}
                              </span>
                              {user.role === 'admin' && (
                                <Badge variant="outline" className="text-[9px] font-medium border-amber-500/30 text-amber-500 bg-amber-500/10 py-0 px-1.5 h-4 shrink-0">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2 min-w-0">
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
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[120px]" title={user.location}>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{user.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0 font-medium">
                          {user.lastActive && (
                            <span>Active {getRelativeTime(user.lastActive)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP / TABLET DATA TABLE (>= 768px) */}
            <Card className="hidden md:block border border-border/80 shadow-none bg-card/60 overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/10">
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      User Registrations ({data?.timeLabel || 'Last 24 Hours'})
                    </h2>
                    {data?.count !== undefined && (
                      <Badge variant="secondary" className="font-medium text-xs px-2 py-0.5 rounded-full">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                      </Badge>
                    )}
                  </div>
                  {(selectedMonth || selectedDate || searchQuery) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={handleClearFilters}
                    >
                      Reset filters
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
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
                        <p className="text-sm font-medium text-foreground">No user registrations found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          {searchQuery 
                            ? `No signups matching "${searchQuery}".` 
                            : data?.timeLabel 
                              ? `No user accounts registered during ${data.timeLabel}.` 
                              : "No new user accounts registered in this period."}
                        </p>
                      </div>
                      {(searchQuery || selectedDate || selectedMonth) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs mt-2"
                          onClick={handleClearFilters}
                        >
                          Reset active filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table className="w-full min-w-[700px]">
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
                                <span className="text-xs font-medium text-foreground">
                                  {getRelativeTime(user.lastActive)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground font-mono">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
