import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import DailyActiveUser from '@/models/DailyActiveUser';

async function handler(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD format

    let startRange;
    let endRange;
    let label;

    if (dateParam) {
      // Validate format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Parse as start of the day in UTC
      startRange = new Date(dateParam);
      if (isNaN(startRange.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date' },
          { status: 400 }
        );
      }

      // Add 24 hours for end bounds
      endRange = new Date(startRange.getTime() + 24 * 60 * 60 * 1000);
      label = dateParam;
    } else {
      // Default: Last 24 hours
      startRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
      endRange = new Date();
      label = 'Last 24 Hours';
    }

    // Find users signed up in the range, selecting only required fields for optimization & security
    const newUsers = await User.find(
      { createdAt: { $gte: startRange, $lt: endRange } },
      'name email image role isVerified createdAt lastActive'
    ).sort({ createdAt: -1 });

    // Count total users in the system for general context using estimated count (O(1) metadata check)
    const totalUsers = await User.estimatedDocumentCount();

    return NextResponse.json({
      success: true,
      count: newUsers.length,
      users: await Promise.all(newUsers.map(async (user) => {
        // Look up user's geocoded location from activity records
        const activeRecord = await DailyActiveUser.findOne(
          { 'users.email': user.email },
          { 'users.$': 1 }
        ).sort({ createdAt: -1 });

        let location = 'Unknown';
        if (activeRecord && activeRecord.users && activeRecord.users[0]) {
          const u = activeRecord.users[0];
          location = u.country !== 'Unknown' 
            ? (u.city !== 'Unknown' ? `${u.city}, ${u.country}` : u.country)
            : 'Unknown';
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role || 'user',
          isVerified: user.isVerified || false,
          createdAt: user.createdAt,
          lastActive: user.lastActive,
          location
        };
      })),
      totalUsers,
      timeLabel: label
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
