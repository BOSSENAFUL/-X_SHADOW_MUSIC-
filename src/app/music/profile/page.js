"use client";

import { useSession, signOut } from "next-auth/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Calendar, LogOut, Settings } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar className="hidden md:flex" />
        <SidebarInset className="md:ml-0">
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (status === "unauthenticated") {
    return (
      <SidebarProvider>
        <AppSidebar className="hidden md:flex" />
        <SidebarInset className="md:ml-0">
          <div className="flex items-center justify-center h-screen">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <CardTitle>Not Signed In</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                  Please sign in to view your profile.
                </p>
                <Button onClick={() => window.location.href = "/login"}>
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">
                    Music
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                    <AvatarFallback className="text-2xl">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{session?.user?.name || 'User'}</CardTitle>
                    <p className="text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{session?.user?.name || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{session?.user?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.createdAt 
                        ? new Date(session.user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Account Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => window.location.href = "/music/library"}
                >
                  <User className="w-4 h-4 mr-2" />
                  View Your Library
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => window.location.href = "/music/playlists"}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Playlists
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full justify-start" 
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}