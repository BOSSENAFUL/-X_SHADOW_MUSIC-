import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import CommunityPost from '@/models/CommunityPost';
import CommunityComment from '@/models/CommunityComment';
import User from '@/models/User'; // Ensure User is registered to resolve population
import mongoose from 'mongoose';

const FEATURED_USER_ID = "6933abbaf6ce46addfd82b25";

export async function GET(req) {
  try {
    await dbConnect();

    // Find all post IDs where the featured user has commented
    const commentedPostDocs = await CommunityComment.find(
      { author: new mongoose.Types.ObjectId(FEATURED_USER_ID) },
      { post: 1 }
    ).lean();

    const commentedPostIds = new Set(
      commentedPostDocs.map(c => c.post.toString())
    );

    const posts = await CommunityPost.find({})
      .populate('author', 'name image')
      .sort({ createdAt: -1 })
      .limit(50);

    // Sort: posts where featured user commented come first, rest follow in original order
    const sorted = [
      ...posts.filter(p => commentedPostIds.has(p._id.toString())),
      ...posts.filter(p => !commentedPostIds.has(p._id.toString())),
    ];

    return NextResponse.json({ success: true, data: sorted });
  } catch (error) {
    console.error("GET Community posts error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    // Check session for authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID from the email (standard practice in this project)
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { title, content, type } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "Title and content are required" }, { status: 400 });
    }

    const newPost = await CommunityPost.create({
      author: user._id,
      title,
      content,
      type: type || 'post',
    });

    // Return with populated author info
    const populatedPost = await CommunityPost.findById(newPost._id).populate('author', 'name image');

    return NextResponse.json({ success: true, data: populatedPost });
  } catch (error) {
    console.error("POST Community post error:", error);
    return NextResponse.json({ success: false, error: "Failed to create post" }, { status: 500 });
  }
}
