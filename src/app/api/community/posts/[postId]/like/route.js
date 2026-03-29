import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import CommunityPost from '@/models/CommunityPost';
import User from '@/models/User';

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
    
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    
    // Toggle like
    const userId = user._id;
    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      // Remove like
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Add like
      post.likes.push(userId);
    }
    
    await post.save();
    
    return NextResponse.json({ success: true, isLiked: !isLiked, likeCount: post.likes.length });
  } catch (error) {
    console.error("POST like error:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle like" }, { status: 500 });
  }
}
