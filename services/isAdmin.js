const user = require("../models/users");
function isAdmin(req, res, next) {
    if (req.isAuthenticated()) {
      if (req.user.role === 'admin') {
        return next(); // Proceed to the admin route
      } else {
        req.flash("error", "You do not have permission to access this page.");
        return res.redirect("/feed"); // Redirect to the user's home page if not an admin
      }
    } else {
      req.flash("error", "You need to log in to access this page.");
      return res.redirect("/login"); // Redirect to login page if not authenticated
    }
  }
 
  module.exports = isAdmin;