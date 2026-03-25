import mongoose from 'mongoose';
import { UAParser } from 'ua-parser-js';

const dailyActiveUserSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  users: [{
    email: {
      type: String,
      required: true
    },
    name: String,
    country: String,
    city: String,
    os: String,
    firstSeenAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalUsers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Unique index on date to prevent duplicate date documents
dailyActiveUserSchema.index({ date: 1 }, { unique: true });

// Compound index for efficient user lookup within dates
dailyActiveUserSchema.index({ date: 1, 'users.email': 1 });

// Helper function to detect platform (OS + Browser vs PWA)
// isPWA must come from the client side since only the browser knows the display-mode
function getPlatform(request, isPWA = false) {
  try {
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) return 'Unknown';

    const parser = new UAParser(userAgent);
    const os = parser.getOS();

    // Build OS string e.g. "Android 10", "Windows 11", "iOS 17", "macOS 14"
    let osStr = os.name || 'Unknown';
    if (os.version) osStr += ` ${os.version}`;

    // Append display mode — only client can know if running as installed PWA
    const modeStr = isPWA ? 'PWA' : 'Browser';

    // Final format: "Android 10 (PWA)", "Windows 11 (Browser)", "iOS 17 (PWA)"
    return `${osStr} (${modeStr})`;
  } catch (error) {
    console.warn('Failed to detect platform:', error.message);
  }

  return 'Unknown';
}

// Helper function to get location data from IP
async function getLocationFromIP(request) {
  try {
    // Get client IP from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    let clientIP = forwarded ? forwarded.split(',')[0] : realIP;

    // Clean up IP address (remove ::ffff: prefix if present)
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }

    // Check if it's a local IP or empty
    const isLocal = !clientIP || clientIP === '127.0.0.1' || clientIP === '::1';

    try {
      // Primary API: ip-api.com (HTTP only for free tier, but works from server side)
      // When running on server, without IP param, it detects server IP. 
      // So for localhost development, this will get the dev machine's location.
      const apiUrl = isLocal
        ? 'http://ip-api.com/json/'
        : `http://ip-api.com/json/${clientIP}`;

      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          return {
            country: data.country || 'Unknown',
            city: data.city || 'Unknown'
          };
        }
      }
    } catch (e) {
      console.warn('Primary geo API failed, trying fallback:', e.message);
    }

    try {
      // Fallback API: ipapi.co (HTTPS supported)
      // ipapi.co returns location of caller if IP is not provided
      const fallbackUrl = isLocal
        ? 'https://ipapi.co/json/'
        : `https://ipapi.co/${clientIP}/json/`;

      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown'
        };
      }
    } catch (e) {
      console.warn('Fallback geo API failed:', e.message);
    }

  } catch (error) {
    console.warn('Failed to fetch location data:', error.message);
  }

  return {
    country: 'Unknown',
    city: 'Unknown'
  };
}

// Static method to record user activity
// isPWA: boolean sent from the client (server cannot detect this)
dailyActiveUserSchema.statics.recordUserActivity = async function (userEmail, userName = null, request = null, isPWA = false) {
  // Always compute the date server-side using IST (Asia/Kolkata)
  // Never trust the client-provided date — this avoids timezone mismatches
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Hoist these OUTSIDE try/catch so they are never fetched twice.
  // The old code re-fetched them inside the `catch` block (wasting a geo-IP
  // API call on every race condition hit).
  let locationData = { country: 'Unknown', city: 'Unknown' };
  let osData = 'Unknown';
  if (request) {
    locationData = await getLocationFromIP(request);
    osData = getPlatform(request, isPWA); // e.g. "Android 10 (PWA)"
  }

  const userPayload = {
    email: userEmail,
    name: userName,
    country: locationData.country,
    city: locationData.city,
    os: osData,
    firstSeenAt: new Date()
  };

  try {
    // ─── Step 1: Ensure document for 'today' exists (Document-level Upsert) ─────
    // We only upsert based on 'date' to guarantee we never create more than one 
    // document per calendar day, even if the unique index hasn't built yet.
    await this.findOneAndUpdate(
      { date: today },
      { $setOnInsert: { date: today, users: [], totalUsers: 0 } },
      { upsert: true, new: true }
    );

    // ─── Step 2: Push the user ONLY if they are not already recorded ───────────
    // This is atomic and works even if other users are being added simultaneously.
    const result = await this.findOneAndUpdate(
      {
        date: today,
        'users.email': { $ne: userEmail } // skip if user already recorded
      },
      {
        $push: { users: userPayload },
        $inc: { totalUsers: 1 }
      },
      { new: true }
    );

    if (result) {
      return { success: true, message: 'User activity recorded', isNew: true };
    }

    return { success: true, message: 'User already recorded for today', isNew: false };

  } catch (error) {
    // Unique index catch-all (backup for simultaneous creations on very first hit of the day)
    if (error.code === 11000 && error.keyPattern?.date) {
      const retryResult = await this.findOneAndUpdate(
        {
          date: today,
          'users.email': { $ne: userEmail }
        },
        {
          $push: { users: userPayload },
          $inc: { totalUsers: 1 }
        },
        { new: true }
      );

      if (retryResult) {
        return { success: true, message: 'User activity recorded', isNew: true };
      }
      return { success: true, message: 'User already recorded for today', isNew: false };
    }

    console.error('Error recording user activity:', error);
    throw error;
  }
};

// Static method to get daily stats
dailyActiveUserSchema.statics.getDailyStats = async function (days = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const endDateStr = endDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const stats = await this.find({
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    })
      .select('date totalUsers')
      .sort({ date: 1 })
      .lean();

    return stats;
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    throw error;
  }
};

const DailyActiveUser = mongoose.models.DailyActiveUser || mongoose.model('DailyActiveUser', dailyActiveUserSchema);

export default DailyActiveUser;
