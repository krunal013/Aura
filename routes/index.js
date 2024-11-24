const express = require("express");
const router = express.Router();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const crypto = require("crypto");
var http = require("http").Server(app);
const nodemailer = require("nodemailer");
require("dotenv").config();
var io = require("socket.io")(http);
const cron = require("node-cron");
var app = express();
const userModel = require("../models/users");
const postModel = require("../models/post");
const catModel = require("../models/catagory");
const Event = require("../models/event");
const work = require("../models/work");
const Work = require("../models/work");
const { upload, handleMulterErrors } = require("../services/multer");
const {
  workUpload,
  handleMulterErrorstwo,
} = require("../services/work_multer");

const razorpay = require("../services/razorpay");

passport.use(new LocalStrategy(userModel.authenticate()));
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());

// ====================================================================================
// Routes for Authantication (signup , verify-otp  , login , forgot-password ,logout)
// ====================================================================================

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route to render the signup page
router.get("/signup", (req, res) => {
  res.render("signup", { error: req.flash("error") });
});

router.post("/register", async (req, res) => {
  const { username, email, mobileNumber, fullname, password, category } =
    req.body;

  try {
    // Check if the email already exists in the database
    const existingUserByEmail = await userModel.findOne({ email });
    if (existingUserByEmail) {
      // Flash message if the email already exists
      req.flash(
        "error",
        "Email is already registered. Please use a different email."
      );
      return res.redirect("/signup"); // Redirect to the signup page with the flash message
    }

    // Check if the username already exists in the database
    const existingUserByUsername = await userModel.findOne({ username });
    if (existingUserByUsername) {
      // Flash message if the username already exists
      req.flash(
        "error",
        "Username is already taken. Please choose a different username."
      );
      return res.redirect("/signup"); // Redirect to the signup page with the flash message
    }

    const userData = new userModel({
      username,
      email,
      mobileNumber,
      fullname,
      category,
    });

    // Generate OTP as a number
    const otp = crypto.randomInt(100000, 999999); // Generate 6-digit number
    userData.otp = otp;

    await userModel.register(userData, password);

    // Set session flag for registration process
    req.session.isInRegistrationProcess = true;

    // Log OTP to confirm it's generated correctly
    console.log("Generated OTP:", otp);

    // Send OTP to user's email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification - OTP",
      text: `Your OTP for email verification is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).json({ message: "Failed to send OTP" });
      }
      res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
    });
  } catch (error) {
    console.error("Registration error:", error);
    // Flash an error message and redirect back
    req.flash("error", "Error in registration. Please try again.");
    res.redirect("/signup"); // Redirect back to registration page
  }
});

// Verify OTP route
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!req.session.isInRegistrationProcess) {
    return res.status(403).json({ message: "Unauthorized access" });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Log saved OTP and user-provided OTP for debugging
    console.log(`Saved OTP: ${user.otp}, Provided OTP: ${otp}`);

    // Convert provided OTP to number and compare with saved OTP
    if (user.otp === Number(otp)) {
      user.emailVerified = true;
      user.otp = null; // Clear OTP after successful verification
      await user.save();

      // Clear registration process flag
      req.session.isInRegistrationProcess = false;
      res.redirect("/login");
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to render OTP verification page
router.get("/verify-otp", (req, res) => {
  if (!req.session.isInRegistrationProcess) {
    return res.redirect("/signup");
  }

  const email = req.query.email;
  res.render("otp", { email });
});

// Route to render the login page
router.get("/login", function (req, res, next) {
  res.render("login", { error: req.flash("error") });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/admin",
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {}
);

//////////////////////////////////////////////////////////////////
// Route to render forgot password page
//////////////////////////////////////////////////////////////////
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password"); // Render a page to enter email
});

// Route to handle forgot password form submission
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(400).send("User with that email does not exist.");
  }

  // Generate a token for password reset
  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
  await user.save();

  // Send email with the token (Use your real SMTP server or service like SendGrid)
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    to: user.email,
    from: "krunalmistry2510@gmail.com",
    subject: "Password Reset",
    text: `You are receiving this email because you requested a password reset for your account.\n\n
      Please click the following link or paste it into your browser to reset your password:\n\n
      http://${req.headers.host}/reset-password/${token}\n\n
      If you did not request this, please ignore this email.\n`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error sending email");
    }
    res.send("Password reset email sent.");
  });
});

router.get("/reset-password/:token", async (req, res) => {
  const user = await userModel.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Ensure the token has not expired
  });

  if (!user) {
    return res
      .status(400)
      .send("Password reset token is invalid or has expired.");
  }

  res.render("reset-password", { token: req.params.token }); // Render reset password form
});

// Route to handle new password submission
router.post("/reset-password/:token", async (req, res) => {
  const user = await userModel.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .send("Password reset token is invalid or has expired.");
  }

  // Set new password using passport-local-mongoose
  user.setPassword(req.body.password, async (err) => {
    if (err) {
      return res.status(500).send("Error resetting password");
    }

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send("Password has been reset successfully.");
  });
});

// Route to handle user logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// ====================================================================================
// Routes for profile management (insert , delete , download , like )
// ====================================================================================

router.get("/newprofile", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");
  const categories = await catModel.find();
  const posts = await postModel.find({ user: user });
  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.likes ? post.likes.length : 0),
    0
  );
  const totalDownloads = posts.reduce(
    (sum, post) => sum + (post.downloads || 0),
    0
  );
  const currentTime = new Date();
  const expirationTime = user.paymentExpires;
  let remainingTime;

  if (expirationTime > currentTime) {
    const diff = expirationTime - currentTime;

    // Calculate days, hours, and minutes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    remainingTime = { days, hours, minutes };
  } else {
    // Plan has already expired
    remainingTime = { days: 0, hours: 0, minutes: 0 };
  }
  res.render("newprofile", {
    user,
    totalLikes,
    totalDownloads,
    remainingTime,
    categories,
  });
});

router.get("/profile", isLoggedIn, async (req, res) => {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");
  res.render("profile", { user });
});

// Route to handle file upload for profile image
router.post(
  "/fileupload",
  isLoggedIn,
  upload.single("image"),
  async (req, res) => {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.profileimage = req.file.filename;
    await user.save();
    res.redirect("/newprofile");
  }
);

// Route to handle file upload for posts
router.post("/upload", isLoggedIn, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(404).send("No file was given");
    }

    const { fileCaption, className } = req.body;

    if (!className) {
      return res.status(400).send("Class name is required");
    }

    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Create the post
    const post = await postModel.create({
      image: req.file.filename,
      imagetext: fileCaption,
      className: className,
      user: user._id,
    });

    // Add the post's ID to the user's `posts` array
    user.posts.push(post._id);
    await user.save(); // Don't forget to save the user document after modifying it

    res.redirect("/newprofile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/posts/:id/like", isLoggedIn, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user._id; // Assuming req.user contains the logged-in user

  try {
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    const likedIndex = post.likes.indexOf(userId);

    if (likedIndex === -1) {
      // User has not liked the post yet, add their ID
      post.likes.push(userId);
    } else {
      // User has already liked the post, remove their ID
      post.likes.splice(likedIndex, 1);
    }

    await post.save();
    return res.status(200).json({ likes: post.likes.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Increment download count for a specific post
router.post("/incrementDownloadCount/:postId", async (req, res) => {
  const postId = req.params.postId;

  try {
    const post = await postModel.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Increment the download count
    post.downloads = (post.downloads || 0) + 1;

    const updatedPost = await post.save();
    return res.json({ success: true, newDownloadCount: updatedPost.downloads });
  } catch (error) {
    console.error("Error incrementing download count:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/delete/:id", isLoggedIn, async (req, res) => {
  try {
    // Find the post
    const post = await postModel.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Delete the post from the postModel
    await postModel.findOneAndDelete({ _id: req.params.id });

    // Remove the post reference from the user's posts array
    await userModel.updateOne(
      { _id: post.user }, // Find the user by the post's user ID
      { $pull: { posts: req.params.id } } // Pull the post's ID from the posts array
    );

    res.redirect("/newprofile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// ====================================================================================
// Routes for Feed Page
// ====================================================================================

router.get("/feed", isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find();
    const categories = await catModel.find();
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const posts = await postModel.find().populate("user");

    // Determine greeting based on the current hour
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) {
      greeting = "Good Morning";
    } else if (hour < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    res.render("feed", { user, posts, categories, greeting });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// ====================================================================================
// Routes for Payment Page
// ====================================================================================

router.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: 4900, // Amount in paise (₹49.00)
      currency: "INR",
      receipt: "order_rcptid_11",
    };
    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Function to verify payment signature
function verifyPaymentSignature(paymentId, orderId, signature) {
  const secret = "CY2wLdo1jVFxCFAmlwKIyt3n"; // Your Key Secret (from Razorpay)
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}

// Route to handle payment success
router.post("/payment-success", async (req, res) => {
  const { payment_id, order_id, signature } = req.body;

  const isValid = verifyPaymentSignature(payment_id, order_id, signature);
  if (!isValid) {
    console.error("Invalid payment signature");
    return res.status(400).send("Invalid signature");
  }

  try {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (!user) {
      console.error("User not found");
      return res.status(404).send("User not found");
    }

    // Set hasPaid to true and set expiration date to 28 days from now
    user.hasPaid = true;
    user.paymentExpires = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // 28 days
    await user.save();

    // Set session variable for subscription status
    req.session.isSubscribed = true;
    res.redirect("/event");
  } catch (error) {
    console.error("Payment success error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to get premium content
router.get("/premium-content", (req, res) => {
  if (req.session.isSubscribed) {
    res.render("event"); // Render event.ejs for premium content
  } else {
    res.redirect("/error"); // Redirect to pricing.ejs for subscription
  }
});
router.get("/pricing", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("pricing", { user });
});

// ====================================================================================
// Routes for premium content ( event , work , chat )
// ====================================================================================

// Route to render the event page, with authentication and payment checks
router.get("/event", isLoggedIn, hasPaid, async (req, res) => {
  try {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const event = await Event.findOne().sort({ createdAt: -1 }); // Fetch the latest event
    if (!event) {
      return res.status(404).render("404", { user }); // Handle event not found
    }
    res.render("event", { user, event });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.get("/work", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const event = await Event.findOne().sort({ createdAt: -1 }); // Fetch the latest event

    if (!event) {
      return res.status(404).render("404", { user }); // Handle if no event is found
    }

    res.render("work", { user, event }); // Pass event to the template
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.post(
  "/workupload",
  isLoggedIn,
  workUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  handleMulterErrorstwo,
  async (req, res) => {
    try {
      if (!req.files || (!req.files.image && !req.files.video)) {
        return res.status(400).send("No file was uploaded.");
      }

      const { description, title, usermail, usernumber, uname, eventId } =
        req.body;
      const user = await userModel.findOne({
        username: req.session.passport.user,
      });

      if (!user) {
        return res.status(404).send("User not found.");
      }

      const workData = {
        title: title || "Untitled",
        description: description || "",
        usermail: usermail || "",
        usernumber: usernumber || "",
        uname: uname || "",
        user: user._id,
        event: eventId, // Associate work with the event
      };

      if (req.files.image) {
        workData.image = req.files.image[0].filename;
      }

      if (req.files.video) {
        workData.video = req.files.video[0].filename;
      }

      const newWork = new work(workData);
      await newWork.save();

      res.redirect("/feedback");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error.");
    }
  }
);

router.get("/feedback", isLoggedIn, (req, res) => {
  res.render("feedback");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Listen for chat messages
  socket.on("chat message", async (data) => {
    const { sender, message } = data;

    try {
      // Find the user and update their messages array
      await userModel.findOneAndUpdate(
        { fullname: sender }, // Assuming `fullname` is unique and used to identify the user
        {
          $push: {
            messages: { sender, message, timestamp: new Date() },
          },
        }
      );
      // Emit the message to all connected clients
      io.emit("chat message", { sender, message });
    } catch (error) {
      console.error("Error saving message: ", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

router.get("/chat", isLoggedIn, hasPaid, async (req, res) => {
  try {
    // Find the logged-in user and retrieve their messages
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    // Render the chat page and pass the user and their messages
    res.render("chat", { user, messages: user.messages });
  } catch (error) {
    console.error("Error fetching messages: ", error);
    res.status(500).send("Internal server error");
  }
});

// ====================================================================================
// Routes for Guest user ( Landing Page , About Event , leaderBoard )
// ====================================================================================


router.get("/", async (req, res) => {
  const works = await work.find();
  res.render("index", { works });
});

router.get("/AboutEvent", (req, res) => {
  res.render("AboutEvent");
});

router.get("/leaderboard", async (req, res) => {
  try {
    const latestEvent = await Event.findOne().sort({ createdAt: -1 });

    if (!latestEvent) {
      return res.status(404).send("No events found.");
    }

    // Fetch users who joined the event
    const works = await Work.find({ event: latestEvent._id }).populate("user");

    if (!works.length) {
      return res.status(404).send("No works found for the latest event.");
    }

    // Separate winners and losers
    const winners = works.filter((work) => work.status !== "loser");
    const losers = works.filter((work) => work.status === "loser");

    res.render("leaderboard", {
      event: latestEvent,
      winners,
      losers,
    });
  } catch (error) {
    console.error("Error fetching event participants:", error);
    res.status(500).send("Server error.");
  }
});

router.get("/error", (req, res) => {
  res.render("error");
});

router.get("/notfound", (req, res) => {
  res.render("notfound");
});

// ====================================================================================
// Routes for MiddleWare (isloggedin , haspaid )
// ====================================================================================

// Middleware functions
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Middleware function to check payment status
async function hasPaid(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const user = await userModel.findOne({
        username: req.session.passport.user,
      });
      if (!user) {
        return res.redirect("/login");
      }

      // Check if payment has expired
      if (user.hasPaid && user.paymentExpires < new Date()) {
        user.hasPaid = false; // Expire subscription
        await user.save();
      }

      if (user.hasPaid || req.session.isSubscribed) {
        return next();
      } else {
        return res.redirect("/pricing");
      }
    } catch (err) {
      console.error(err);
      return res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
}

router.get("/event-participants", isLoggedIn, async (req, res) => {
  try {
    const latestEvent = await Event.findOne().sort({ createdAt: -1 });

    if (!latestEvent) {
      return res.status(404).send("No events found.");
    }

    // Fetch users who joined the event
    const works = await Work.find({ event: latestEvent._id }).populate("user");

    if (!works.length) {
      return res.status(404).send("No works found for the latest event.");
    }

    // Separate winners and losers
    const winners = works.filter((work) => work.status !== "loser");
    const losers = works.filter((work) => work.status === "loser");

    res.render("event-participants", {
      event: latestEvent,
      winners,
      losers,
    });
  } catch (error) {
    console.error("Error fetching event participants:", error);
    res.status(500).send("Server error.");
  }
});

module.exports = router;
