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

// Helper function to get OS from User-Agent
function getOSFromUserAgent(request) {
  try {
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) return 'Unknown';

    const parser = new UAParser(userAgent);
    const os = parser.getOS();

    // Return OS name and version if available
    if (os.name) {
      return os.version ? `${os.name} ${os.version}` : os.name;
    }
  } catch (error) {
    console.warn('Failed to parse User-Agent:', error.message);
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
dailyActiveUserSchema.statics.recordUserActivity = async function (userEmail, userName = null, request = null) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // Get location and OS data if request is provided
    let locationData = { country: 'Unknown', city: 'Unknown' };
    let osData = 'Unknown';
    if (request) {
      locationData = await getLocationFromIP(request);
      osData = getOSFromUserAgent(request);
    }

    // First, try to add user to existing document (if user doesn't already exist)
    const result = await this.findOneAndUpdate(
      {
        date: today,
        'users.email': { $ne: userEmail } // Only update if user email doesn't exist
      },
      {
        $push: {
          users: {
            email: userEmail,
            name: userName,
            country: locationData.country,
            city: locationData.city,
            os: osData,
            firstSeenAt: new Date()
          }
        },
        $inc: { totalUsers: 1 }
      },
      { new: true }
    );

    if (result) {
      return { success: true, message: 'User activity recorded', isNew: true };
    }

    // If no result, either document doesn't exist or user already exists
    // Check if document exists for today
    const existingDoc = await this.findOne({ date: today });

    if (existingDoc) {
      // Document exists, so user must already be recorded
      return { success: true, message: 'User already recorded for today', isNew: false };
    }

    // Document doesn't exist, create it with this user
    const newDoc = await this.create({
      date: today,
      users: [{
        email: userEmail,
        name: userName,
        country: locationData.country,
        city: locationData.city,
        os: osData,
        firstSeenAt: new Date()
      }],
      totalUsers: 1
    });

    return { success: true, message: 'User activity recorded', isNew: true };

  } catch (error) {
    // Handle duplicate key error for date (if two requests try to create same date document)
    if (error.code === 11000 && error.keyPattern?.date) {
      // Document was created by another request, try to add user to it
      let locationData = { country: 'Unknown', city: 'Unknown' };
      let osData = 'Unknown';
      if (request) {
        locationData = await getLocationFromIP(request);
        osData = getOSFromUserAgent(request);
      }

      const updateResult = await this.findOneAndUpdate(
        {
          date: today,
          'users.email': { $ne: userEmail }
        },
        {
          $push: {
            users: {
              email: userEmail,
              name: userName,
              country: locationData.country,
              city: locationData.city,
              os: osData,
              firstSeenAt: new Date()
            }
          },
          $inc: { totalUsers: 1 }
        },
        { new: true }
      );

      if (updateResult) {
        return { success: true, message: 'User activity recorded', isNew: true };
      } else {
        return { success: true, message: 'User already recorded for today', isNew: false };
      }
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

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

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