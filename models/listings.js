const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review")

const listingSchema = new Schema({
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  image: {
    filename: String,
    url: {
      type: String, 
      default: "https://images.unsplash.com/photo-1541328519168-a91fdd710096?q=80&w=1931&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  },
  price: {
    type: Number,
  },
  location: {
    type: String,
  },
  country: {
    type: String,
  },
  reviews: [
    {
    type: Schema.Types.ObjectId,
    ref: "Review",
  }
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  }
});

listingSchema.post("findOneAndDelete", async (listing) => {
    await Review.deleteMany({reviews: {$in: listing.reviews}});
});

const Listing = mongoose.model("listing", listingSchema);
module.exports = Listing;
