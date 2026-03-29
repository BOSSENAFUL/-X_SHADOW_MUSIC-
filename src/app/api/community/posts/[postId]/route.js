import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CommunityPost from '@/models/CommunityPost';
import CommunityComment from '@/models/CommunityComment';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req, { params }) {
  try {
    const { postId } = await params;
    await dbConnect();
    
    const post = await CommunityPost.findById(postId)
      .populate('author', 'name image');
      
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("GET Single Community post error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch post" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    await dbConnect();
    
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    
    // Check ownership
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized to delete this post" }, { status: 403 });
    }
    
    // Delete post & comments
    await CommunityPost.findByIdAndDelete(postId);
    await CommunityComment.deleteMany({ post: postId });
    
    return NextResponse.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE Single Community post error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 });
  }
}
