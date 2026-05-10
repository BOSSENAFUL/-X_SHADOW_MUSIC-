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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, AlertCircle, Send, Loader2, ThumbsUp, ChevronLeft, Calendar, Trash2 } from "lucide-react";
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
  const [replyingTo, setReplyingTo] = useState(null); // Track which comment is being replied to
  const [replyContent, setReplyContent] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      // Fetch post
      const postRes = await fetch(`/api/community/posts/${postId}`);
      const postData = await postRes.json();
      if (postData.success) {
        setPost(postData.data);
      } else {
        toast.error("Post not found");
        router.push("/music/chat");
        return;
      }

      // Fetch comments
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

    if (parentId) setIsSubmittingComment(true); // use global loading for simplicity or could be local
    else setIsSubmittingComment(true);

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

        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6 pb-24 space-y-8">

          {/* Post Content */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-border/20">
                  <AvatarImage src={post.author?.image} alt={post.author?.name} />
                  <AvatarFallback className="bg-muted text-xs">{post.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground">{post.author?.name}</span>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground font-medium">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {post.type === 'issue' && (
                    <div className="text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide border border-destructive/20 bg-destructive/5 px-2 py-0.5 rounded-md text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Issue
                    </div>
                  )}
                  {session?.user?.id === post.author?._id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors ml-2"
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

              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-tight">
                {post.title}
              </h1>
            </div>

            <Card className="bg-transparent border-border/60 overflow-hidden rounded-xl">
              <CardContent className="p-4 md:p-6 lg:p-8">
                <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                  {post.content}
                </p>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t border-border/40 p-3 md:p-4 px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-6 md:gap-8">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 transition-colors font-bold text-[10px] md:text-xs uppercase tracking-wider hover:text-foreground ${post.likes?.some(id => id === session?.user?.id) ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 md:w-4 md:h-4 ${post.likes?.some(id => id === session?.user?.id) ? 'fill-current' : ''}`} />
                    {post.likes?.some(id => id === session?.user?.id) ? 'Liked' : 'Like'} ({post.likes?.length || 0})
                  </button>
                  <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {comments.length} Comments
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>

          <Separator className="bg-border/50" />

          {/* Comments Section */}
          <section className="space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Discussion
              <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
            </h2>

            {/* Post a Comment Area */}
            <div className="flex gap-3 md:gap-4 items-start mt-4 mb-8">
              <Avatar className="w-8 h-8 md:w-10 md:h-10 shrink-0 mt-0.5">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                <AvatarFallback className="bg-zinc-800 text-xs">{session?.user?.name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-3">
                <Textarea
                  placeholder="Add a comment..."
                  className="bg-transparent border-0 border-b border-zinc-800 rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-zinc-500 resize-none min-h-[40px] text-sm md:text-base text-zinc-200"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={isSubmittingComment || !commentContent.trim()}
                    className="gap-2 h-8 text-xs font-semibold rounded-full px-5"
                    size="sm"
                  >
                    {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Post
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-6 md:space-y-8 mt-6">
              {comments.filter(c => !c.parentComment).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                comments.filter(c => !c.parentComment).map((comment) => {
                  const replies = comments.filter(r => r.parentComment === comment._id);
                  return (
                    <div key={comment._id} className="space-y-4">
                      {/* Top Level Comment */}
                      <div className="flex gap-3 md:gap-4">
                        <Avatar className="w-8 h-8 md:w-10 md:h-10 shrink-0">
                          <AvatarImage src={comment.author?.image} alt={comment.author?.name} />
                          <AvatarFallback className="bg-muted text-xs">{comment.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{comment.author?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                            <button
                              onClick={() => handleCommentLike(comment._id)}
                              className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${comment.likes?.includes(session?.user?.id) ? 'text-foreground' : ''}`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${comment.likes?.includes(session?.user?.id) ? 'fill-current' : ''}`} />
                              {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
                            </button>
                            <button
                              onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                              className="hover:text-foreground transition-colors"
                            >
                              Reply
                            </button>
                          </div>

                          {/* Inline Reply Form */}
                          {replyingTo === comment._id && (
                            <div className="mt-4 flex flex-col gap-3 animate-in fade-in duration-200">
                              <Textarea
                                placeholder="Add a reply..."
                                className="bg-transparent border-0 border-b border-border rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-ring resize-none min-h-[40px] text-sm text-foreground"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="h-7 text-xs font-semibold rounded-full px-4 text-muted-foreground hover:text-foreground">Cancel</Button>
                                <Button size="sm" onClick={() => handleAddComment(null, replyContent, comment._id)} className="h-7 text-xs font-semibold rounded-full px-4">Reply</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="ml-11 md:ml-14 space-y-4 pt-1">
                          {replies.map((reply) => (
                            <div key={reply._id} className="flex gap-3">
                              <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                                <AvatarImage src={reply.author?.image} alt={reply.author?.name} />
                                <AvatarFallback className="bg-muted text-[10px]">{reply.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs md:text-sm text-foreground">{reply.author?.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                  {reply.content}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                                  <button
                                    onClick={() => handleCommentLike(reply._id)}
                                    className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${reply.likes?.includes(session?.user?.id) ? 'text-foreground' : ''}`}
                                  >
                                    <ThumbsUp className={`w-3.5 h-3.5 ${reply.likes?.includes(session?.user?.id) ? 'fill-current' : ''}`} />
                                    {reply.likes?.length > 0 && <span>{reply.likes.length}</span>}
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
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
