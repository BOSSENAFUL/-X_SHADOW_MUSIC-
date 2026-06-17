"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, AlertCircle, Send, Plus, Loader2, ThumbsUp, MessageCircle, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ChatPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortMode, setSortMode] = useState("new");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("post");

  useEffect(() => {
    fetchPosts();
  }, [sortMode]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/posts?sort=${sortMode}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Fetch posts error:", error);
      toast.error("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts([data.data, ...posts]);
        setTitle("");
        setContent("");
        setShowForm(false);
        toast.success(type === 'post' ? "Post created!" : "Issue reported!");
      } else {
        toast.error(data.error || "Failed to create post");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (e, postId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(post =>
          post._id === postId ? { ...post, likes: data.isLiked ? [...post.likes, session?.user?.id] : post.likes.filter(id => id !== session?.user?.id) } : post
        ));
      }
    } catch (error) {
      toast.error("An error occurred while liking");
    }
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === "all") return true;
    return post.type === activeTab;
  });

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
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
                  <BreadcrumbPage>Community Chat & Issues</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            size="sm"
            className="rounded-full gap-2"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </header>

        <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-36 md:pb-28">

          {/* Create Post Form */}
          {showForm && (
            <div className="border-b border-border p-4 md:p-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                    <AvatarFallback className="bg-muted text-xs">{session?.user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit border border-border">
                      <button
                        type="button"
                        onClick={() => setType("post")}
                        className={`px-3 py-1 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${type === 'post' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        POST
                      </button>
                      <button
                        type="button"
                        onClick={() => setType("issue")}
                        className={`px-3 py-1 md:px-4 md:py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${type === 'issue' ? 'bg-destructive/20 text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        ISSUE
                      </button>
                    </div>
                    <Input
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-transparent border-0 border-b border-border rounded-none px-1 focus-visible:ring-0 focus-visible:border-border h-9 md:h-10 text-sm font-medium placeholder:text-muted-foreground/60"
                      required
                    />
                    <Textarea
                      placeholder="What's on your mind?"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="bg-transparent border-0 border-b border-border rounded-none px-1 focus-visible:ring-0 focus-visible:border-border min-h-[80px] md:min-h-[100px] text-sm md:text-base resize-none placeholder:text-muted-foreground/60"
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-xs h-8 rounded-full px-4">Cancel</Button>
                      <Button type="submit" size="sm" disabled={isSubmitting || !title.trim() || !content.trim()} className="gap-2 text-xs h-8 rounded-full px-5">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Filtering Tabs */}
          <div className="border-b border-border">
            <div className="flex items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-6 md:gap-8">
                {["all", "post", "issue"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'}`}
                  >
                    {tab === "all" ? "All" : tab === "post" ? "Posts" : "Issues"}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-3">
                    {sortMode === "admin" ? "Admin" : "New"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-popover border-border text-foreground p-1">
                  <DropdownMenuItem
                    onClick={() => setSortMode("new")}
                    className={`text-xs cursor-pointer hover:bg-accent focus:bg-accent ${sortMode === "new" ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                  >
                    New Posts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortMode("admin")}
                    className={`text-xs cursor-pointer hover:bg-accent focus:bg-accent whitespace-nowrap ${sortMode === "admin" ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                  >
                    Admin Latest Commented
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Posts List */}
          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Loading community discussions...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-muted-foreground">No posts here yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Be the first one to start a conversation!</p>
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="rounded-full">Create Post</Button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post._id}
                  onClick={() => router.push(`/music/chat/${post._id}`)}
                  className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer px-4 md:px-6 py-4"
                >
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 md:w-12 md:h-12 shrink-0">
                      <AvatarImage src={post.author?.image} alt={post.author?.name} />
                      <AvatarFallback className="bg-muted text-xs">{post.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs md:text-sm">
                        <span className="font-bold text-foreground">{post.author?.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                        {post.type === 'issue' && (
                          <span className="text-destructive text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide ml-auto">
                            <AlertCircle className="w-3 h-3" />
                            Issue
                          </span>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-foreground leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-5 pt-1">
                        <button
                          onClick={(e) => handleLike(e, post._id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-foreground ${post.likes?.some(id => id === session?.user?.id) ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${post.likes?.some(id => id === session?.user?.id) ? 'fill-current' : ''}`} />
                          {post.likes?.length || 0}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                          {post.commentCount || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
