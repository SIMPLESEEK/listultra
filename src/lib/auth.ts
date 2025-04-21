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
        if (!credentials?.email || !credentials?.password) {
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
          return {
            id: user._id.toString(), // Convert ObjectId to string
            email: user.email,
            // Add other fields if needed by your callbacks, e.g., name: user.name
          };

        } catch (error) {
          console.error('Authorize error:', error);
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
    async jwt({ token, user }) {
      if (user) {
        // Assuming your 'user' object from authorize has an 'id' property
        token.id = user.id; 
        token.email = user.email;
        // Add other properties if needed, e.g., token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
         // Add other properties if needed, e.g., session.user.name = token.name as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
}; 