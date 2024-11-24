// passport-config.js
const LocalStrategy = require("passport-local").Strategy;
const User = require("./users"); // Adjust the path to your User model
module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "usernameOrEmail",
        passwordField: "password",
      },
      async (usernameOrEmail, password, done) => {
        try {
          // Find user by username or email
          let user = await User.findOne({
            $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
          });
          if (!user) {
            return done(null, false, { message: "No user found" });
          }

          // Check if the user account is deactivated
          if (user.status === "deactivated") {
            return done(null, false, {
              message:
                "Your account has been deactivated. Please contact support.",
            });
          }

          // Check if password is correct
          user.authenticate(password, function (err, isMatch) {
            if (err) return done(err);
            if (!isMatch)
              return done(null, false, { message: "Password is incorrect" });
            return done(null, user);
          });
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
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
