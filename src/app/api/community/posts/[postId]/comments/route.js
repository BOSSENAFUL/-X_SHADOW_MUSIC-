import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import CommunityPost from '@/models/CommunityPost';
import CommunityComment from '@/models/CommunityComment';
import User from '@/models/User';

export async function GET(req, { params }) {
  try {
    const { postId } = await params;
    await dbConnect();
    
    // Check if post exists first
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    
    const comments = await CommunityComment.find({ post: postId })
      .populate('author', 'name image')
      .sort({ createdAt: 1 });
      
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error("GET comments for post error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { postId } = await params;
    await dbConnect();
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    
    const { content, parentCommentId } = await req.json();
    if (!content) {
      return NextResponse.json({ success: false, error: "Comment content is required" }, { status: 400 });
    }
    
    // Check if post exists
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    // Check if parent comment exists if provided
    if (parentCommentId) {
      const parentComment = await CommunityComment.findById(parentCommentId);
      if (!parentComment) {
        return NextResponse.json({ success: false, error: "Parent comment not found" }, { status: 404 });
      }
    }
    
    // Create the comment
    const newComment = await CommunityComment.create({
      post: postId,
      author: user._id,
      content,
      parentComment: parentCommentId || null,
    });
    
    // Increment comment count on post
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();
    
    const populatedComment = await CommunityComment.findById(newComment._id).populate('author', 'name image');
    
    return NextResponse.json({ success: true, data: populatedComment });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ success: false, error: "Failed to add comment" }, { status: 500 });
  }
}
