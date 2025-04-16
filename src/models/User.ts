import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'] 
  },
  passwordHash: { 
    type: String, 
    required: [true, 'Password hash is required'] 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure email index for faster lookups
UserSchema.index({ email: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'users'); 