import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/User.js';

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await User.findByEmailWithPassword(email);
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        if (!user.is_active) {
          return done(null, false, { message: 'Account is disabled' });
        }
        const isValid = await user.verifyPassword(password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        user.last_login = new Date();
        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ id });
    if (!user) {
      return done(null, false);
    }
    return done(null, user.toPublicJSON());
  } catch (err) {
    return done(err);
  }
});

export default passport;
