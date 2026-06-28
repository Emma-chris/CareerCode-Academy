import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as UserModel from '../models/user';
import * as TokenModel from '../models/token';
import { generateToken, generateRefreshToken } from '../utils/helpers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback';

export function configurePassport() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), undefined);
          }

          let user = await UserModel.getUserByEmail(email);

          if (!user) {
            const name = profile.displayName || email.split('@')[0];
            user = await UserModel.createUser({
              name,
              email,
              password: '',
              role: 'student',
              is_verified: true,
            });
          }

          const tokenPayload = { userId: user.id, role: user.role };
          const token = generateToken(tokenPayload);
          const refreshToken = generateRefreshToken(tokenPayload);
          const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

          return done(null, { user, token, refreshToken });
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
