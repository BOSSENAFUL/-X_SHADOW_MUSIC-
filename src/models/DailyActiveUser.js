import mongoose from 'mongoose';

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

// Helper function to get location data from IP
async function getLocationFromIP(request) {
  try {
    // Get client IP from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = forwarded ? forwarded.split(',')[0] : realIP;
    
    // For development/localhost, use the API without IP parameter
    const apiUrl = clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1' 
      ? `https://pinip.net/api?format=json&ip=${clientIP}`
      : 'https://pinip.net/api?format=json';
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Jammify-Analytics/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
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
    // Get location data if request is provided
    let locationData = { country: 'Unknown', city: 'Unknown' };
    if (request) {
      locationData = await getLocationFromIP(request);
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
      if (request) {
        locationData = await getLocationFromIP(request);
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