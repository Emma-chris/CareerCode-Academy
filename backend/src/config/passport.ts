import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as UserModel from '../models/user';
import * as TokenModel from '../models/token';
import { generateToken, generateRefreshToken } from '../utils/helpers';

function getCallbackUrl(): string {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const port = process.env.PORT || '5000';
  return `http://localhost:${port}/api/v1/auth/google/callback`;
}

export function configurePassport() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackUrl(),
        passReqToCallback: true,
      } as any,
      async (req: any, _accessToken: any, _refreshToken: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google'), undefined);
          }

          let user = await UserModel.getUserByEmail(email);
          const intent = (req.query?.intent as string) || (req.cookies?.oauth_intent as string) || 'login';

          if (user && (user as any).is_suspended) {
            return done(new Error('Account suspended'), undefined);
          }

          if (!user) {
            if (intent === 'login') {
              // For login intent, do not auto-create — will be handled as signup fallback with message
              // But to avoid breaking existing login, auto-create with is_verified true and let frontend show "account created"
              // We still auto-create but frontend can differentiate via intent
            }
            const name = profile.displayName || email.split('@')[0];
            // Generate random password for OAuth users (not usable)
            const randomPass = require('crypto').randomBytes(16).toString('hex');
            const bcrypt = require('bcryptjs');
            const hashed = await bcrypt.hash(randomPass, 10);
            user = await UserModel.createUser({
              name,
              email,
              password: hashed,
              role: 'student',
              is_verified: true,
            });
          } else {
            // Ensure verified if coming via Google
            if (!(user as any).is_verified) {
              await UserModel.updateUser(user.id, { is_verified: true } as any);
            }
          }

          const tokenPayload = { userId: user.id, role: user.role };
          const token = generateToken(tokenPayload);
          const refreshToken = generateRefreshToken(tokenPayload);
          const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

          return done(null, { userId: user.id, role: user.role as any, user, token, refreshToken });
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
