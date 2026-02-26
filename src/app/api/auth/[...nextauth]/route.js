import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          await connectDB();

          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            return null;
          }

          if (!user.isVerified) {
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            return null;
          }

          // Update lastActive on successful login
          user.lastActive = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role || 'user',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google' || account?.provider === 'github') {
          await connectDB();

          console.log('OAuth SignIn - Provider:', account.provider, 'Email:', user.email);

          let existingUser = await User.findOne({ email: user.email });

          if (existingUser) {
            console.log('Found existing user:', existingUser._id.toString());
            // Update OAuth ID if not set
            if (account.provider === 'google' && !existingUser.googleId) {
              existingUser.googleId = account.providerAccountId;
              existingUser.isVerified = true;
            }
            if (account.provider === 'github' && !existingUser.githubId) {
              existingUser.githubId = account.providerAccountId;
              existingUser.isVerified = true;
            }
            // Update lastActive on every sign-in
            existingUser.lastActive = new Date();
            await existingUser.save();
            // Set the user ID and role for OAuth users
            user.id = existingUser._id.toString();
            user.role = existingUser.role || 'user';
            console.log('Set user.id to:', user.id);
          } else {
            console.log('Creating new user for OAuth');
            // Create new user for OAuth
            const newUser = new User({
              name: user.name || user.email.split('@')[0],
              email: user.email,
              image: user.image,
              isVerified: true,
              emailVerified: new Date(),
              role: 'user',
              ...(account.provider === 'google' && { googleId: account.providerAccountId }),
              ...(account.provider === 'github' && { githubId: account.providerAccountId }),
            });
            const savedUser = await newUser.save();
            // Set the user ID and role for OAuth users
            user.id = savedUser._id.toString();
            user.role = savedUser.role || 'user';
            console.log('Created new user with ID:', user.id);
          }
        }
        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      // If user object is present (first time login)
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
      }

      // Handle session updates (if you use useSession().update())
      if (trigger === 'update' && session) {
        return { ...token, ...session };
      }

      // Ensure token.id is valid, otherwise try to fetch it
      if (!token.id || !mongoose.Types.ObjectId.isValid(token.id)) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }).select('_id role').lean();
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role || 'user';
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };