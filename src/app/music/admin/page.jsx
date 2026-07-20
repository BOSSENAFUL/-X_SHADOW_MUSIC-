"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppSidebar } from '@/components/app-sidebar';
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
  X
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/new-users');
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
      fetchStats();
    }
  }, [status, session, fetchStats]);

  // Client-side date formatting helper to avoid hydration mismatches
  const formatDateTime = (dateString) => {
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
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    // Guard against client clock drift
    if (diffMs <= 0) return 'just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  // ── Render States ──────────────────────────────────────────────────────────

  // 1. Session Loading
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard session...</p>
        </div>
      </div>
    );
  }

  // 2. Access Denied (Not logged in or not Admin)
  const isAuthorized = status === 'authenticated' && session?.user?.role === 'admin';
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md w-full text-center space-y-6 bg-card border border-border rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-destructive/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
            <p className="text-sm text-muted-foreground">
              This page contains administration metrics and is strictly restricted to authorized administrator accounts.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button className="w-full" onClick={() => router.push('/music')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Web Player
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered users list based on search query
  const usersList = data?.users || [];
  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-x-hidden h-svh flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/music')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Admin Panel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 shrink-0" 
                onClick={fetchStats}
                disabled={refreshing}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1 bg-background">
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-32">
            
            {/* Title & Description */}
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Admin Overview
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time user registration tracking and analytics metrics.
              </p>
            </div>

            {/* Stat Cards */}
            {loadingStats ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm">
                Error loading metrics: {error}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {/* 24h Signups */}
                <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
                  <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Daily Signups</span>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
                      <Users className="w-5 h-5" />
                      {data?.count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">{data?.count}</span>
                    <span className="text-xs text-muted-foreground">new users (24h)</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live counter updating automatically
                  </p>
                </div>

                {/* Total Registered Users */}
                <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
                  <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Total Users</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">{data?.totalUsers}</span>
                    <span className="text-xs text-muted-foreground">total accounts</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    Historical signups database
                  </p>
                </div>

                {/* Horizon Detail */}
                <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
                  <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Active Window</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <Shield className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-bold block text-foreground">Last 24 Hours</span>
                    <span className="text-xs text-muted-foreground block mt-1">
                      Tracking signups starting from:<br />
                      <strong className="text-foreground">{formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Users List Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold tracking-tight">Daily New User Registrations</h2>
                  <p className="text-xs text-muted-foreground">
                    Detailed lookup for all users that created accounts in the previous 24 hour window.
                  </p>
                </div>
                
                {/* Search query input */}
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search name or email..." 
                    className="pl-9 pr-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Users Table / List */}
              {loadingStats ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border border-dashed rounded-2xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">No users found</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {searchQuery 
                        ? `No signups found matching search string "${searchQuery}".` 
                        : "No new accounts have been registered within the last 24 hours."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Signed Up</th>
                          <th className="px-6 py-4">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsers.map((user) => (
                          <tr 
                            key={user.id} 
                            className="hover:bg-accent/40 transition-colors duration-150 group"
                          >
                            {/* Profile details */}
                            <td className="px-6 py-4 flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-lg border border-border/80">
                                <AvatarImage src={user.image} alt={user.name} />
                                <AvatarFallback className="rounded-lg bg-accent text-accent-foreground font-semibold">
                                  {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                                  {user.name || 'Anonymous User'}
                                </span>
                                <span className="text-xs text-muted-foreground leading-normal">
                                  {user.email}
                                </span>
                              </div>
                            </td>

                            {/* User Role Badge */}
                            <td className="px-6 py-4">
                              {user.role === 'admin' ? (
                                <Badge variant="default" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20">
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground border border-border">
                                  User
                                </Badge>
                              )}
                            </td>

                            {/* Verification status */}
                            <td className="px-6 py-4">
                              {user.isVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/45" />
                                  Unverified
                                </span>
                              )}
                            </td>

                            {/* Signup Timestamp */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-foreground font-medium">
                                  {getRelativeTime(user.createdAt)}
                                </span>
                                <span className="text-xxs text-muted-foreground">
                                  {formatDateTime(user.createdAt)}
                                </span>
                              </div>
                            </td>

                            {/* Last Active Timestamp */}
                            <td className="px-6 py-4 text-muted-foreground">
                              {getRelativeTime(user.lastActive) ? (
                                <div className="flex flex-col">
                                  <span className="text-foreground">
                                    {getRelativeTime(user.lastActive)}
                                  </span>
                                  <span className="text-xxs text-muted-foreground">
                                    {formatDateTime(user.lastActive)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs italic">Never</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
