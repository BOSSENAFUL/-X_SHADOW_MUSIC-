"use client";

import { useState, useEffect, use } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, MoreHorizontal, MessageSquare, AlertCircle, Send, Loader2, ThumbsUp, ChevronLeft, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PostDetailPage({ params }) {
  const { postId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyContent, setReplyContent] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Renders text with clickable URLs
  const renderWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 break-all hover:text-primary/80 transition-colors"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postRes = await fetch(`/api/community/posts/${postId}`);
      const postData = await postRes.json();
      if (postData.success) {
        setPost(postData.data);
      } else {
        toast.error("Post not found");
        router.push("/music/chat");
        return;
      }

      const commRes = await fetch(`/api/community/posts/${postId}/comments`);
      const commData = await commRes.json();
      if (commData.success) {
        setComments(commData.data);
      }
    } catch (error) {
      console.error("Fetch data error:", error);
      toast.error("Failed to load post data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e, contentOverride = null, parentId = null) => {
    if (e) e.preventDefault();
    const activeContent = contentOverride || commentContent;
    if (!activeContent.trim()) return;

    setIsSubmittingComment(true);

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: activeContent,
          parentCommentId: parentId
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.data]);
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setCommentContent("");
        }
        toast.success(parentId ? "Reply added!" : "Comment added!");
      } else {
        toast.error(data.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const res = await fetch(`/api/community/comments/${commentId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setComments(comments.map(c =>
          c._id === commentId ? {
            ...c,
            likes: data.isLiked ? [...c.likes, session?.user?.id] : c.likes.filter(id => id !== session?.user?.id)
          } : c
        ));
      }
    } catch (error) {
      toast.error("An error occurred while liking");
    }
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPost({
          ...post,
          likes: data.isLiked ? [...post.likes, session?.user?.id] : post.likes.filter(id => id !== session?.user?.id)
        });
      }
    } catch (error) {
      toast.error("An error occurred while liking");
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Post deleted successfully");
        router.push("/music/chat");
      } else {
        toast.error(data.error || "Failed to delete post");
        setIsDeleting(false);
      }
    } catch (error) {
      toast.error("An error occurred while deleting the post");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar className="hidden md:flex" />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
          <div className="flex flex-col items-center justify-center flex-1 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground animate-pulse">Loading discussion detail...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!post) return null;

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/music/chat")}
              className="p-2 hover:bg-muted rounded-full transition-colors mr-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
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
                  <BreadcrumbLink href="/music/chat">
                    Community
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Post Detail</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 md:p-6 pb-36 md:pb-24">

          {/* Original Post */}
          <div className="flex gap-3 md:gap-4 items-stretch group">
            <div className="flex flex-col items-center shrink-0">
              <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-border/10 shadow-sm">
                <AvatarImage src={post.author?.image} alt={post.author?.name} />
                <AvatarFallback className="bg-muted text-xs">{post.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm md:text-base text-foreground hover:underline cursor-pointer">{post.author?.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2">
                  {post.type === 'issue' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded">Issue</span>
                  )}
                  {session?.user?.id === post.author?._id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={isDeleting}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors text-muted-foreground"
                          title="Delete post"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-popover border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Delete Post</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to delete this post? This action cannot be undone and will remove all associated comments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent text-foreground hover:bg-muted border-border">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeletePost}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              <h1 className="text-lg md:text-xl font-extrabold text-foreground mb-1 leading-tight tracking-tight">
                {post.title}
              </h1>
              <div className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4 font-medium">
                {renderWithLinks(post.content)}
              </div>
              
              <div className="flex items-center gap-4 text-muted-foreground">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 transition-all active:scale-90 ${post.likes?.some(id => id === session?.user?.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                >
                  <Heart className={`w-5 h-5 ${post.likes?.some(id => id === session?.user?.id) ? 'fill-current' : ''}`} />
                  <span className="text-xs font-semibold">{post.likes?.length || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-primary transition-all active:scale-90">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-semibold">{comments.length}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Post a Comment Area */}
          <div className="flex gap-3 md:gap-4 items-stretch">
            <div className="flex flex-col items-center shrink-0">
              <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-border/10 shadow-sm">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                <AvatarFallback className="bg-zinc-800 text-xs">{session?.user?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 pb-8">
              <div className="relative group">
                <Textarea
                  placeholder={`Reply to ${post.author?.name}...`}
                  className="bg-transparent border-none border-b border-border/40 rounded-none px-2 py-2 focus-visible:ring-0 focus-visible:border-primary resize-none min-h-[40px] text-sm md:text-base text-foreground placeholder:text-muted-foreground/60 transition-all"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                />
                <div className={`flex justify-end mt-2 transition-all duration-300 ${commentContent.trim() ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                  <Button
                    onClick={handleAddComment}
                    disabled={isSubmittingComment}
                    className="h-8 text-xs font-bold rounded-full px-5 bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95"
                    size="sm"
                  >
                    {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex flex-col">
            {comments.filter(c => !c.parentComment).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm border-t border-border/20 mt-4">
                No replies yet.
              </div>
            ) : (
              comments.filter(c => !c.parentComment).map((comment) => {
                const replies = comments.filter(r => r.parentComment === comment._id);
                return (
                  <div key={comment._id} className="flex flex-col">
                    <div className="-mx-4 md:-mx-6 h-px bg-border my-4" />
                    {/* Top Level Comment */}
                    <div className="flex gap-3 md:gap-4 items-stretch group">
                      <div className="flex flex-col items-center shrink-0">
                        <Avatar className="w-8 h-8 md:w-10 md:h-10">
                          <AvatarImage src={comment.author?.image} alt={comment.author?.name} />
                          <AvatarFallback className="bg-muted text-xs">{comment.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {replies.length > 0 && (
                          <div className="w-[2px] flex-1 bg-border mt-2 mb-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">{comment.author?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                          {renderWithLinks(comment.content)}
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground mt-3">
                          <button
                            onClick={() => handleCommentLike(comment._id)}
                            className={`flex items-center gap-1.5 transition-all active:scale-90 ${comment.likes?.includes(session?.user?.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                          >
                            <Heart className={`w-4 h-4 ${comment.likes?.includes(session?.user?.id) ? 'fill-current' : ''}`} />
                            {comment.likes?.length > 0 && <span className="text-xs font-semibold">{comment.likes.length}</span>}
                          </button>
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            className="flex items-center gap-1.5 hover:text-primary transition-all active:scale-90"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-semibold">Reply</span>
                          </button>
                        </div>

                        {/* Inline Reply Form */}
                        {replyingTo === comment._id && (
                          <div className="mt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Textarea
                              placeholder={`Reply to ${comment.author?.name}...`}
                              className="bg-transparent border-none border-b border-border rounded-none px-2 py-2 focus-visible:ring-0 focus-visible:border-primary resize-none min-h-[40px] text-sm text-foreground"
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="h-7 text-xs font-bold rounded-full px-4 text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
                              <Button size="sm" onClick={() => handleAddComment(null, replyContent, comment._id)} className="h-7 text-xs font-bold rounded-full px-4 bg-foreground text-background hover:bg-foreground/90">Reply</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="flex flex-col">
                        {replies.map((reply, index) => (
                          <div key={reply._id} className="flex gap-3 md:gap-4 items-stretch group">
                            <div className="flex flex-col items-center shrink-0">
                              <Avatar className="w-8 h-8 md:w-10 md:h-10">
                                <AvatarImage src={reply.author?.image} alt={reply.author?.name} />
                                <AvatarFallback className="bg-muted text-xs">{reply.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              {index < replies.length - 1 && (
                                      <div className="w-[2px] flex-1 bg-border mt-2 mb-2" />
                                    )}
                                  </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center mb-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">{reply.author?.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                                {renderWithLinks(reply.content)}
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground mt-3">
                                <button
                                  onClick={() => handleCommentLike(reply._id)}
                                  className={`flex items-center gap-1.5 transition-all active:scale-90 ${reply.likes?.includes(session?.user?.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${reply.likes?.includes(session?.user?.id) ? 'fill-current' : ''}`} />
                                  {reply.likes?.length > 0 && <span className="text-xs font-semibold">{reply.likes.length}</span>}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
