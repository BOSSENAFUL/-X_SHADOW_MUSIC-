import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import CommunityComment from '@/models/CommunityComment';
import User from '@/models/User';

export async function POST(req, { params }) {
  try {
    const { commentId } = await params;
    await dbConnect();
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    
    const comment = await CommunityComment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }
    
    // Toggle like
    const userId = user._id;
    const isLiked = comment.likes.includes(userId);
    
    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
    }
    
    await comment.save();
    
    return NextResponse.json({ success: true, isLiked: !isLiked, likeCount: comment.likes.length });
  } catch (error) {
    console.error("POST comment like error:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle like" }, { status: 500 });
  }
}
