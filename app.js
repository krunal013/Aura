var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const expressSession = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
require("dotenv").config();

var indexRouter = require("./routes/index");
var usersRouter = require("./models/users");
const adminRouter = require("./routes/admin"); // Admin router

const User = require("./models/users"); // Ensure the correct path to User model
// const { deserialize } = require("v8");
const isAdmin = require("./services/isAdmin");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.use("/work_upload", express.static(path.join(__dirname, "work_upload")));
app.set("view engine", "ejs");

app.use(
  expressSession({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "secret",
  })
);

// Initialize Passport
require("./models/passport-config")(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash({}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/admin", isAdmin, adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
