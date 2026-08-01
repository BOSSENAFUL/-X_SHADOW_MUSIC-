import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import DailyActiveUser from '@/models/DailyActiveUser';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function handler(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD format
    const monthParam = searchParams.get('month'); // YYYY-MM format

    const now = new Date();
    let startRange;
    let endRange;
    let label;

    if (monthParam) {
      // Validate YYYY-MM format
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(monthParam)) {
        return NextResponse.json(
          { success: false, error: 'Invalid month format. Use YYYY-MM' },
          { status: 400 }
        );
      }

      const [yearStr, mStr] = monthParam.split('-');
      const year = parseInt(yearStr, 10);
      const mIdx = parseInt(mStr, 10) - 1; // 0-indexed

      if (isNaN(year) || isNaN(mIdx) || mIdx < 0 || mIdx > 11) {
        return NextResponse.json(
          { success: false, error: 'Invalid month/year values' },
          { status: 400 }
        );
      }

      // UTC start of target month
      startRange = new Date(Date.UTC(year, mIdx, 1, 0, 0, 0, 0));
      // UTC start of next month
      endRange = new Date(Date.UTC(year, mIdx + 1, 1, 0, 0, 0, 0));
      label = `${MONTH_NAMES[mIdx]} ${year}`;
    } else if (dateParam) {
      // Validate YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const [yStr, mStr, dStr] = dateParam.split('-');
      const year = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      const day = parseInt(dStr, 10);

      startRange = new Date(Date.UTC(year, mIdx, day, 0, 0, 0, 0));
      endRange = new Date(Date.UTC(year, mIdx, day + 1, 0, 0, 0, 0));

      if (isNaN(startRange.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date' },
          { status: 400 }
        );
      }
      label = dateParam;
    } else {
      // Default: Last 24 hours
      startRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
      endRange = new Date();
      label = 'Last 24 Hours';
    }

    // Current UTC Month Boundaries
    const currentYear = now.getUTCFullYear();
    const currentMonthIdx = now.getUTCMonth();
    const startOfCurrentMonthUTC = new Date(Date.UTC(currentYear, currentMonthIdx, 1, 0, 0, 0, 0));
    const startOfLastMonthUTC = new Date(Date.UTC(currentYear, currentMonthIdx - 1, 1, 0, 0, 0, 0));
    const thirtyDaysAgoUTC = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel execution of analytical queries
    const [
      newUsers,
      totalUsers,
      thisMonthCount,
      lastMonthCount,
      last30DaysCount,
      rawMonthlyBreakdown
    ] = await Promise.all([
      // Filtered Users List (for active query window)
      User.find(
        { createdAt: { $gte: startRange, $lt: endRange } },
        'name email image role isVerified createdAt lastActive'
      ).sort({ createdAt: -1 }).lean(),

      // Total accounts
      User.estimatedDocumentCount(),

      // Users this calendar month (UTC)
      User.countDocuments({ createdAt: { $gte: startOfCurrentMonthUTC } }),

      // Users previous calendar month (UTC)
      User.countDocuments({
        createdAt: { $gte: startOfLastMonthUTC, $lt: startOfCurrentMonthUTC }
      }),

      // Users in last 30 rolling days
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgoUTC } }),

      // Monthly aggregated registration stats (past 12 months)
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    // Format Monthly Breakdown for UI consumption
    const monthlyBreakdown = rawMonthlyBreakdown.map((item) => {
      const y = item._id.year;
      const m = item._id.month; // 1-12
      const monthStr = String(m).padStart(2, '0');
      const labelStr = `${MONTH_NAMES[m - 1]} ${y}`;
      return {
        monthKey: `${y}-${monthStr}`,
        year: y,
        month: m,
        label: labelStr,
        count: item.count
      };
    });

    // Batch optimize location lookups to avoid N+1 database queries
    const emails = newUsers.map((u) => u.email).filter(Boolean);
    const locationMap = new Map();

    if (emails.length > 0) {
      const activeRecords = await DailyActiveUser.find(
        { 'users.email': { $in: emails } },
        { 'users.email': 1, 'users.country': 1, 'users.city': 1, createdAt: 1 }
      ).sort({ createdAt: -1 }).lean();

      activeRecords.forEach((record) => {
        if (Array.isArray(record.users)) {
          record.users.forEach((u) => {
            if (u.email && !locationMap.has(u.email)) {
              const country = u.country && u.country !== 'Unknown' ? u.country : '';
              const city = u.city && u.city !== 'Unknown' ? u.city : '';
              let loc = 'Unknown';
              if (city && country) {
                loc = `${city}, ${country}`;
              } else if (country) {
                loc = country;
              } else if (city) {
                loc = city;
              }
              locationMap.set(u.email, loc);
            }
          });
        }
      });
    }

    const formattedUsers = newUsers.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role || 'user',
      isVerified: Boolean(user.isVerified),
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      location: locationMap.get(user.email) || 'Unknown'
    }));

    // Calculate month-over-month growth percentage
    let monthGrowthPercent = 0;
    if (lastMonthCount > 0) {
      monthGrowthPercent = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 1000) / 10;
    }

    const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
    const currentMonthLabel = `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`;

    return NextResponse.json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
      totalUsers,
      stats: {
        thisMonthCount,
        lastMonthCount,
        last30DaysCount,
        monthGrowthPercent,
        currentMonthLabel,
        currentMonthKey
      },
      monthlyBreakdown,
      timeLabel: label,
      queryMode: monthParam ? 'month' : dateParam ? 'date' : '24h'
    });
  } catch (error) {
    console.error('Error fetching admin new users statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin stats data' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);

