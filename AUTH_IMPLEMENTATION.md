# Jammify Authentication Implementation

## Overview

Jammify implements a comprehensive authentication system using **NextAuth.js v4** with multiple authentication providers and custom credential-based authentication. The system supports OAuth providers (Google, GitHub), email/password authentication with OTP verification, password reset functionality, and robust session management.

## Architecture

### Core Technologies
- **NextAuth.js v4**: Primary authentication framework
- **MongoDB**: User data storage with Mongoose ODM
- **JWT**: Session strategy for stateless authentication
- **bcryptjs**: Password hashing
- **Nodemailer**: Email service for OTP and password reset
- **Zod**: Form validation
- **React Hook Form**: Form handling

### Authentication Flow

```
User Registration → OTP Email → Email Verification → Account Active
User Login → Credential/OAuth Validation → JWT Session → Protected Routes
```

## Authentication Providers

### 1. OAuth Providers
- **Google OAuth**: `GoogleProvider`
- **GitHub OAuth**: `GitHubProvider`

Both providers automatically:
- Create new users if they don't exist
- Link to existing accounts by email
- Mark accounts as verified
- Update last active timestamp

### 2. Credentials Provider
- Email/password authentication
- Requires email verification via OTP
- Password strength validation (minimum 8 characters)
- Automatic last active timestamp updates

## User Model Schema

```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required for non-OAuth users),
  image: String,
  emailVerified: Date,
  
  // OAuth IDs
  googleId: String,
  githubId: String,
  
  // Verification
  isVerified: Boolean (default: false),
  otpCode: String,
  otpExpires: Date,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Activity Tracking
  lastActive: Date (default: Date.now),
  
  // Authorization
  role: String (enum: ['user', 'admin'], default: 'user')
}
```

## Route Protection

### Middleware Implementation
The application uses Next.js middleware (`src/middleware.js`) for route protection:

**Public Routes** (accessible when NOT logged in):
- `/` - Landing page
- `/login` - Login page
- `/signup` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification

**Private Routes** (require authentication):
- `/music/*` - Main application
- `/profile/*` - User profile
- `/settings/*` - User settings

**Redirect Logic**:
- Unauthenticated users accessing private routes → Redirect to `/login`
- Authenticated users accessing public routes → Redirect to `/music`

## Authentication Features

### 1. User Registration
- **Endpoint**: `POST /api/auth/register`
- **Process**:
  1. Validate input (name, email, password)
  2. Check for existing users
  3. Hash password with bcrypt
  4. Generate 6-digit OTP
  5. Send verification email
  6. Store user as unverified

### 2. Email Verification
- **Endpoint**: `POST /api/auth/verify-email`
- **Process**:
  1. Validate OTP against stored code
  2. Check expiration (10 minutes)
  3. Mark user as verified
  4. Clear OTP data

### 3. Password Reset
- **Request**: `POST /api/auth/forgot-password`
- **Reset**: `POST /api/auth/reset-password`
- **Process**:
  1. Generate JWT reset token (1-hour expiry)
  2. Send reset email with token
  3. Validate token and update password

### 4. Session Management
- **Strategy**: JWT-based sessions
- **Token Contents**: User ID, email
- **Session Duration**: Configurable (default browser session)
- **Automatic Refresh**: Handled by NextAuth.js

## Security Features

### Password Security
- **Hashing**: bcrypt with salt rounds (12)
- **Validation**: Minimum 8 characters
- **Reset**: Secure token-based reset with expiration

### Email Verification
- **OTP**: 6-digit numeric codes
- **Expiration**: 10 minutes
- **Resend**: Automatic for existing unverified users

### Session Security
- **JWT Signing**: Uses `NEXTAUTH_SECRET`
- **Token Validation**: Automatic MongoDB ObjectId validation
- **CSRF Protection**: Built into NextAuth.js

### Route Protection
- **Middleware**: Server-side route protection
- **Client-side**: Session-aware components
- **Redirect Handling**: Seamless user experience

## Database Optimizations

### Indexes
```javascript
// Performance indexes
UserSchema.index({ lastActive: -1 });
UserSchema.index({ email: 1, lastActive: -1 });
```

### Sparse Indexes
- `googleId` and `githubId` use sparse indexing
- Allows multiple null values while maintaining uniqueness

## Error Handling

### Authentication Errors
- Invalid credentials
- Unverified accounts
- Expired tokens/OTPs
- Network failures

### User Feedback
- Form validation with Zod
- Real-time error display
- Success confirmations
- Loading states

## Environment Variables

```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Database
MONGODB_URI=your-mongodb-connection-string

# Email Service
EMAIL_FROM=your-email@domain.com
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USER=your-email-username
EMAIL_PASS=your-email-password
```

## User Experience Features

### Social Login
- One-click Google/GitHub authentication
- Automatic account linking by email
- Seamless user experience

### Form Handling
- React Hook Form with Zod validation
- Real-time validation feedback
- Password visibility toggle
- Loading states and error handling

### Responsive Design
- Mobile-friendly authentication forms
- Dark/light theme support
- Accessible form controls

## Activity Tracking

### Online Status
- `lastActive` timestamp updates on:
  - Successful login
  - OAuth sign-in
  - Session refresh
- Used for online user features

### Analytics Integration
- User activity tracking
- Vercel Analytics integration
- Performance monitoring

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js handler |
| `/api/auth/register` | POST | User registration |
| `/api/auth/verify-email` | POST | Email verification |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/auth/reset-password` | POST | Password reset |
| `/api/auth/logout` | POST | User logout |

## Best Practices Implemented

1. **Security First**: Proper password hashing, secure tokens, CSRF protection
2. **User Experience**: Seamless OAuth, clear error messages, responsive design
3. **Performance**: Database indexing, JWT sessions, optimized queries
4. **Maintainability**: Modular code structure, comprehensive error handling
5. **Scalability**: Stateless JWT sessions, efficient database queries

## Potential Improvements

1. **Rate Limiting**: Add rate limiting for auth endpoints
2. **2FA**: Implement two-factor authentication
3. **Session Management**: Add device management and session revocation
4. **Audit Logging**: Track authentication events
5. **Social Providers**: Add more OAuth providers (Discord, Twitter, etc.)

This authentication system provides a solid foundation for a modern web application with security, usability, and scalability in mind.