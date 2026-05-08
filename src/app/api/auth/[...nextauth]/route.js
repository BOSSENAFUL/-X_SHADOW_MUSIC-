import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
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

          // Update lastActive on successful login (targeted update, not full save)
          await User.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });

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

            // Build update payload — only write fields that actually changed
            const updateFields = { lastActive: new Date() };
            if (account.provider === 'google' && !existingUser.googleId) {
              updateFields.googleId = account.providerAccountId;
              updateFields.isVerified = true;
            }
            if (account.provider === 'github' && !existingUser.githubId) {
              updateFields.githubId = account.providerAccountId;
              updateFields.isVerified = true;
            }

            // Single targeted update — much faster than full document save()
            await User.updateOne({ _id: existingUser._id }, { $set: updateFields });

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
      // If user object is present (first time login / OAuth sign-in)
      // user.id and user.role are set in the signIn callback for OAuth,
      // and returned directly from authorize() for credentials.
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
      }

      // Handle session updates (if you use useSession().update())
      if (trigger === 'update' && session) {
        return { ...token, ...session };
      }

      // NOTE: We intentionally do NOT query the DB here on every token refresh.
      // token.id and token.role are written once at sign-in and persist in the
      // signed JWT — no DB round-trip needed on subsequent requests.
      // If a user's role changes, they need to sign out and back in.

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