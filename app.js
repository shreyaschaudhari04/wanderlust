const express = require("express");
const app = express();
const mongoose = require("mongoose");
const port = 3000;
const Listing = require("./models/listings");
const Review = require("./models/review");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const {isLoggedIn, saveRedirectUrl} = require("./middleware.js");
const {redirectUrl} = require("./middleware.js");
require('dotenv').config(); 

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

main().then(() => console.log('Connected to Database')) 
.catch((err) => {
    console.log(err);
});

function wrapAsync(fn) {
    return function (req, res, next) {
      fn(req, res, next).catch(next);
    };
  }
  

async function main (){
    await mongoose.connect(dbUrl);
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
app.use(cookieParser());

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600, 
});

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE", err);
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.get("/", (req,res) => {
    res.cookie("greet", "Namaste")
    res.send("Root Page");
});

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


//Index Route
app.get("/listings", async (req,res) => {
const allListings =  await Listing.find({});
res.render("listings/index.ejs", {allListings});
});

//New Route
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id",async  (req,res) => {
    let {id} = req.params;
   const listing = await Listing.findById(id).populate({path : "reviews", populate: {path: "author"}}).populate("owner");
   if(!listing){
    req.flash("error", "This Listing Does Not exist");
    res.redirect("/listings");
   }
   res.render("listings/show.ejs", {listing});
});

//Create Route
app.post(("/listings"), isLoggedIn, async (req,res) => {
    const newListing = new Listing(req.body)
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
});

//Edit Route
app.get("/listings/:id/edit", isLoggedIn, async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  });

//Update Route
app.put("/listings/:id",isLoggedIn, async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings`);
  });

//Delete Route
app.delete("/listings/:id", isLoggedIn, async (req,res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id, req.body);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
});

//Reviews

// Post Review Route
app.post(("/listings/:id/reviews"), async (req,res) => {
    let {id} = req.params;
    const listing = await Listing.findById(req.params.id);
    let newReview  = new Review (req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success", "New Review Created!");
    res.redirect(`/listings/${id}`);
});

// Post Delete Route
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async(req,res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull:{ reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
})
);

//Signup User
app.get("/signup", (req, res) => {
    res.render("users/signup.ejs"); 
});

app.post("/signup", async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if(err){
                return next(err);
            }
            req.flash("success", "Welcome to Wanderlust");
            res.redirect("/listings");
        })
       
    } catch (err) {
        req.flash("error", "This User is already registered!");
        res.redirect("/signup");
    }
});

//Login User
app.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

app.post("/login",saveRedirectUrl, passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), async (req, res) => {
    req.flash("success", "Welcome to Wanderlust! You are Logged In.");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
});

//SignOut User
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if(err){
           return next(err);
        }
        req.flash("success", "You Have Been Logged Out!");
        res.redirect("/listings");
    })
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})