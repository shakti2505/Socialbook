import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { authorization } from "../middleware/AuthMiddleware.js";
import postModel from "../models/Post.js";
import userModel from "../models/user.js";
import monitorRequests from "../ChangeStreams/ChangeStreams.js";
import friendRequestModal from "../models/FrientRequest.js";
import UserFriendList from "../models/FriendList.js";
import monitor from "../ChangeStreams/ChangeStreams.js";

const storage = multer.memoryStorage();
const uploadPostMedia = multer({
  storage: storage,
  limits: { fileSize: 300 * 300 * 2 },
});
const router = express.Router();

const closeChangeStreams = (changeStreams, timeInMS = 60000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("closing the change streams  ");
      changeStreams.close();
      resolve();
    }, timeInMS);
  });
};

//Create Post

router.post("/createPost", authorization, async (req, res) => {
  const UserId = req.userId;
  const { postcaptions, postimagesURLs, postOwner, postOwnerDP } = req.body;
  try {
    if (postcaptions == "" && postimagesURLs.length == 0) {
      res.status(404).send({ message: "No post found" });
    }
    //staring Streams on Post modal
    const ChangeStreams = await monitor.monitorPosts(
      postModel,
      "Change Stream starts for Post Modal....."
    );
    const newpost = new postModel({
      postCaption: postcaptions,
      postImagesURls: postimagesURLs,
      users: UserId,
      postOwner: postOwner,
      postOwnerDP: postOwnerDP,
    });
    const savedPost = await newpost.save();

    //closing streams
    closeChangeStreams(ChangeStreams);
    res.status(201).send({ message: "Post added successfully!", savedPost });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

//get post
router.get("/get-Post", authorization, async (req, res) => {
  try {
    const UserId = req.userId;
    const page = parseInt(req.query.page);
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    const total = await postModel.countDocuments({ users: UserId });

    const LoggedInUserfriends = await UserFriendList.find({ user: UserId });

    let friendsPosts = [];
    for (const item of LoggedInUserfriends) {
      const posts = await postModel.find({ users: item.friend_ID });
      friendsPosts = friendsPosts.concat(posts);
    }
    const userPosts = await postModel
      .find({ users: UserId })
      .skip(skip)
      .limit(pageSize);
    const allPosts = userPosts.concat(friendsPosts); // Concatenate userPosts and friendsPosts
    return res.status(200).json({
      posts: allPosts, // Return all posts
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

router.get("/get_user_specific_posts", authorization, async (req, res) => {
  try {
    const page = parseInt(req.query.page);   
    const pageSize = parseInt(req.query.pageSize);
    const friendsID = req.query.UserId;
    const skip = (page - 1) * pageSize;

    const total = await postModel.countDocuments({ users: friendsID });

    const posts = await postModel.find({ users: friendsID });
    return res.status(200).json({
      posts: posts,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

//serch potential connections

router.get("/search_potential_connetion", authorization, async (req, res) => {
  const UserId = req.userId;
  const loggedInUser = userModel.findById(UserId);
  if (loggedInUser) {
    const { username } = req.query;
    const user = await userModel
      .find({ firstName: username })
      .select("firstName");
    res.status(200).send(user);
  } else {
    res.sendStatus(500);
  }
});



// get Post's of Friends
router.get("/get_friends_Posts", authorization, async (req, res) => {
  try {
    const UserId = req.userId;
    const loggedInUser = await userModel.findById(UserId);
    if (!loggedInUser) {
      return res.status(401).send("No logged In user found!");
    }
  } catch (error) {
    return res.status(500).send("Internal server error");
  }
});

//edit Posts
router.put('/edit_post', authorization, (req, res)=>{
  try {
    const {PostID, PostCaption, postImages} = req.body;
    if(!PostID){
      return res.status(401).send("Post ID is required");
    }
    const target_post = postModel.findByIdAndUpdate(PostID, {postCaption:PostCaption, postImagesURls:postImages});
    console.log(target_post)
    return res.status(201).send({Message:'Post updated Successfully', target_post})
  } catch (error) {
    console.log(error)
    return res.status(500).send({message:'Internal Server Error'})
  }
})

export default router;
