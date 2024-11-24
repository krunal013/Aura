const express = require("express");
const router = express.Router();
const User = require("../models/users"); // Ensure correct path to the User model
const Category = require("../models/catagory"); // Ensure correct path to the Category model
const postModel = require("../models/post");
const cron = require("node-cron");
const work = require("../models/work");
const Work = require("../models/work");
const Event = require("../models/event"); // Ensure correct path to the Event model
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const crypto = require("crypto");
const mongoose = require("mongoose");
//login
// Middleware functions
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}
// Admin page
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).exec();
    res.render("./admin/admin_users", { users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users");
  }
});

// API for fetching detailed user info (for modal)
// API for fetching detailed user info (for modal)
router.get("/admin/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Fetch user by ID
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("userProfile", { user }); // Render the user profile page with the user data
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Add event page
router.get("/add-event", isLoggedIn, async (req, res) => {
  try {
    const events = await Event.find(); // Fetch all events from the database
    res.render("./admin/add-event", { events }); // Pass events to the view
  } catch (error) {
    console.error("Error fetching add event page:", error);
    res.status(500).send("Error fetching add event page");
  }
});

// POST route to add an event
router.post("/add-event", async (req, res) => {
  try {
    // Create a new event instance
    const newEvent = new Event({
      title: req.body.title,
      description1: req.body.description1,
      description2: req.body.description2,
      description3: req.body.description3,
      description4: req.body.description4,
      price1: req.body.price1,
      price2: req.body.price2,
      price3: req.body.price3,
      date: req.body.date ? new Date(req.body.date) : Date.now(), // Include date from the form, default to now
    });

    // Save the event to the database
    await newEvent.save();

    // Redirect to the admin page or send a success message
    res.status(201).redirect("/admin"); // Change to desired redirect route
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).send("Error adding event.");
  }
});

// view priofile route
router.get("/userprofile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("posts"); // Fetch user by ID
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("./admin/Profile", { user }); // Render the profile view
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/delete/:id", async (req, res) => {
  try {
    // Find the post
    const post = await postModel.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post not found");
    }
    const user = await User.findById(post.user);
    if (!user) {
      return res.status(404).send("User not found");
    }
    // Delete the post from the postModel
    await postModel.findOneAndDelete({ _id: req.params.id });

    // Remove the post reference from the user's posts array
    await User.updateOne(
      { _id: post.user }, // Find the user by the post's user ID
      { $pull: { posts: req.params.id } } // Pull the post's ID from the posts array
    );

    res.render("admin/Profile", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.post("/deactivate-user/:id", async (req, res) => {
  console.log("User ID:", req.params.id); // Check if the userId is correctly received
  try {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(userId, {
      status: "deactivated",
    });
    const users = await User.find().exec();
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }
    res.render("./admin/admin_users", { users });
    // res.status(200).send({ message: "User deactivated successfully!" });
  } catch (err) {
    res.status(500).send({ error: "Failed to deactivate user" });
  }
});

router.get("/extra", isLoggedIn, async (req, res) => {
  // const categories = await catModel.find();
  const posts = await postModel.find();
  const categories = await Category.aggregate([
    {
      $lookup: {
        from: "posts", // The name of the posts collection
        let: { categoryName: "$cname" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$className", "$$categoryName"], // Match className with cname
              },
            },
          },
          {
            $group: {
              _id: null,
              downloads: { $sum: "$downloads" }, // Sum up the downloads
              count: { $sum: 1 }, // Count the number of matching posts
            },
          },
        ],
        as: "posts",
      },
    },
    {
      $project: {
        cname: 1,
        count: { $arrayElemAt: ["$posts.count", 0] }, // Get count of posts
        downloads: { $arrayElemAt: ["$posts.downloads", 0] }, // Get total downloads
      },
    },
  ]);

  res.render("./admin/extra", { categories });
});

router.post("/extra", isLoggedIn, (req, res) => {
  const { className } = req.body; // Extract className from the request body

  // Create a new category entry in the database
  const newCategory = new Category({ cname: className });

  newCategory
    .save()
    .then(() => {
      res.redirect("./"); // Redirect back to the GET route or another page
    })
    .catch((error) => {
      console.error("Error saving to database:", error);
      res.status(500).send("Error saving category.");
    });
});
router.post("/delete-category/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await Category.findByIdAndDelete(id);
    res.redirect("/extra"); // Redirect to your desired page after deleting
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});
router.post("/edit-category/:id", async (req, res) => {
  const { id } = req.params;
  const { cname } = req.body; // Assuming you're sending the new category name in the body

  try {
    await Category.findByIdAndUpdate(id, { cname }, { new: true });
    res.redirect("/extra"); // Redirect to your desired page after editing
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});
router.get("/latest-event-users", isLoggedIn, async (req, res) => {
  try {
    // Fetch the latest event
    const latestEvent = await Event.findOne().sort({ createdAt: -1 });

    if (!latestEvent) {
      return res.status(404).send("No events found.");
    }

    // Find all works associated with the latest event and populate user details
    const works = await Work.find({ event: latestEvent._id }).populate("user");

    if (!works.length) {
      return res.status(404).send("No works found for the latest event.");
    }

    // Render the view and pass the users and event details
    res.render("./admin/latest-event-users", {
      event: latestEvent,
      users: works,
      userWorks: null, // No user works displayed initially
    });
  } catch (error) {
    console.error("Error fetching latest event users:", error);
    res.status(500).send("Server error.");
  }
});
router.post("/assign-winners", isLoggedIn, async (req, res) => {
  try {
    const { eventId, winners } = req.body; // winners is an array containing user IDs for first, second, and third
    if (!winners || winners.length !== 3) {
      return res
        .status(400)
        .send(
          "Please provide exactly 3 users for first, second, and third place."
        );
    }

    // Update user status in the event
    await Work.updateMany(
      { event: eventId },
      { status: "loser" } // Set all users to 'loser' initially
    );

    // Assign status to winners
    await Work.updateOne(
      { user: winners[0], event: eventId },
      { status: "first" }
    );
    await Work.updateOne(
      { user: winners[1], event: eventId },
      { status: "second" }
    );
    await Work.updateOne(
      { user: winners[2], event: eventId },
      { status: "third" }
    );

    res.redirect(`/admin/latest-event-users`);
  } catch (error) {
    console.error("Error assigning winners:", error);
    res.status(500).send("Server error.");
  }
});
// Route to fetch and display works uploaded by a specific user
router.get("/user-works", isLoggedIn, async (req, res) => {
  try {
    const { userId } = req.query;

    // Make sure the userId is just the ObjectId, not the full object
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid user ID.");
    }

    // Fetch works for the given user ID
    const userWorks = await Work.find({ user: userId });

    if (!userWorks.length) {
      return res.status(404).send("No works found for the user.");
    }

    // Render works with images and videos
    res.render("./admin/user-works", { works: userWorks });
  } catch (error) {
    console.error("Error fetching user works:", error);
    res.status(500).send("Server error.");
  }
});

// Route to display the latest event, winners, and losers


module.exports = router;
