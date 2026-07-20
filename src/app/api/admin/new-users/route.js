import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

async function handler(request) {
  try {
    await connectDB();

    // Get timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find users signed up in the last 24 hours
    const newUsers = await User.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 });

    // Count total users in the system for general context
    const totalUsers = await User.countDocuments();

    return NextResponse.json({
      success: true,
      count: newUsers.length,
      users: newUsers.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role || 'user',
        isVerified: user.isVerified || false,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      })),
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching daily new users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin stats data' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
