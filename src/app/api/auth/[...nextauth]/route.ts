import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 