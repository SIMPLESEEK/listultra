import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

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
          // console.log('Authorize: Missing credentials');
          return null;
        }

        try {
          await connectDB();
          // console.log('Authorize: DB connected');
          
          const user = await User.findOne({ email: credentials.email });
          // console.log('Authorize: User found? ', !!user);

          if (!user) {
            // console.log('Authorize: User not found with email', credentials.email);
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          // console.log('Authorize: Password correct? ', isPasswordCorrect);

          if (!isPasswordCorrect) {
            // console.log('Authorize: Incorrect password');
            return null;
          }
          
          // console.log('Authorize: Success, returning user');
          return user;

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 