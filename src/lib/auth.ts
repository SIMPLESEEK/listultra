import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb'; // Assuming this path is correct
import User from '@/models/User';       // Assuming this path is correct

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱地址', type: 'email' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials) {
        console.log('[Auth] Authorize function started.'); // Log start
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Authorize: Missing credentials.');
          return null;
        }

        try {
          await connectDB();
          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordCorrect) {
            return null;
          }
          
          // Return a plain object with necessary fields for JWT/Session
          const authorizedUser = {
            id: user._id.toString(), // Convert ObjectId to string
            email: user.email,
            // Add other fields if needed by your callbacks, e.g., name: user.name
          };
          console.log('[Auth] Authorize successful, returning:', authorizedUser);
          return authorizedUser;

        } catch (error) {
          console.error('[Auth] Authorize error caught:', error);
          return null;
        }
      }
    }),
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // Ensure the 'user' object passed to jwt has the 'id' property
    async jwt({ token, user, account, profile, isNewUser }) { // Log more params if needed
      console.log('[Auth] JWT callback started. User:', user, 'Token:', token);
      if (user) {
        // Assuming your 'user' object from authorize has an 'id' property
        token.id = user.id; 
        token.email = user.email;
        // Add other properties if needed, e.g., token.name = user.name;
        console.log('[Auth] JWT callback: User present, updated token:', token);
      }
      console.log('[Auth] JWT callback finished, returning token:', token);
      return token;
    },
    async session({ session, token, user }) { // Log more params if needed
      console.log('[Auth] Session callback started. Token:', token, 'Session:', session);
      if (session.user && token.id) { // Check token.id exists
        session.user.id = token.id as string;
        session.user.email = token.email as string;
         // Add other properties if needed, e.g., session.user.name = token.name as string;
         console.log('[Auth] Session callback: Token present, updated session:', session);
      } else {
        console.log('[Auth] Session callback: Session user or token.id missing.');
      }
      console.log('[Auth] Session callback finished, returning session:', session);
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
}; 