import mongoose from 'mongoose';

/**
 * A learner's profile.
 *
 * Auth0 owns identity: passwords, Google login and email verification never touch our
 * database. We keep only a small profile (name, picture) keyed by the Auth0 user id, so the
 * app can show who created a course and count a user's activity.
 * The profile is display data only: permissions always come from the verified token's `sub`.
 */
const userSchema = new mongoose.Schema(
  {
    auth0Id: { type: String, required: true, unique: true }, // the token's `sub` claim
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    picture: { type: String, trim: true, maxlength: 2048 },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
