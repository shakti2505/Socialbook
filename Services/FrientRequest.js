import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { authorization } from "../middleware/AuthMiddleware.js";
import userModel from "../models/user.js";
import friendRequestModal from "../models/FrientRequest.js";
import UserFriendList from "../models/FriendList.js";
import displayPictureModel from "../models/displayPictures.js";
import FriendRequestNotificationsModal from "../models/Notifications/FriendRequestNotificaitons.js";
import monitor from "../ChangeStreams/ChangeStreams.js";
import PostNotificationModal from "../models/Notifications/PostNotification.js";
import messageModal from "../models/chat/messageModal.js";
const router = express.Router();

//close streams
const closeChangeStreams = (changeStreams, timeInMS = 60000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("closing the change streams  ");
      changeStreams.close();
      resolve();
    }, timeInMS);
  });
};

// create friend request
router.post("/receieve_friend_requests", authorization, async (req, res) => {
  const UserId = req.userId;
  const {
    friendRequestStatus,
    requestReceiverId,
    username,
    userDisplayPicture,
  } = req.body;
  try {
    if (
      !friendRequestStatus ||
      !requestReceiverId ||
      !username ||
      !userDisplayPicture
    ) {
      return res.status(401).json({ messsgae: "all fields are required " });
    }
    const requestSender = await userModel.findById(UserId);
    const requestreceiver = await userModel.findById(requestReceiverId);
    const requestAlreadyExisted = await friendRequestModal.find({
      requestReceiverID: requestReceiverId,
      frientRequestsenderID: UserId,
    });
    if (
      requestSender &&
      requestreceiver &&
      friendRequestStatus &&
      requestAlreadyExisted.length == 0
    ) {
      //inititing Streams
      const ChangeStreams = await monitor.monitorRequests(
        friendRequestModal,
        "Change Stream starts for Friend Requst Modal....."
      );
      const newFriendRequest = new friendRequestModal({
        frientRequestsenderID: UserId,
        frientRequestStatus: friendRequestStatus,
        requestReceiverID: requestReceiverId,
        senderName: username,
        senderProfilePicture: userDisplayPicture,
      });
      const savedNewfriendrequest = await newFriendRequest.save();
      //closing streams
      closeChangeStreams(ChangeStreams);
      return res.status(201).send({
        message: "Friend request sent",
        sentrequest: savedNewfriendrequest,
      });
    } else {
      return res
        .status(401)
        .send({ message: "No sender found or request already existed" });
    }
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
});

//received pending friend request
router.get("/get_received_friendRequests", authorization, async (req, res) => {
  try {
    const UserId = req.userId;
    const loggedInUser = await userModel.findById(UserId);
    const pending_friend_request = await friendRequestModal.find({
      requestReceiverID: UserId,
    });
    if (loggedInUser && pending_friend_request) {
      return res.status(200).json(pending_friend_request);
    } else {
      return res.status(400).send("No Logged in User found");
    }
  } catch (error) {
    return res.status(500).send({ error });
  }
});

//action of frient request
router.post(
  "/accept_reject_friend_request",
  authorization,
  async (req, res) => {
    try {
      let status = ["pending", "rejected", "accepted"];
      const UserId = req.userId;
      const {
        frientRequestID,
        frientRequestStatus,
        requestSenderName,
        requestSenderDp,
        requestReceiverName,
        requestReceivedDP,
        notification_id,
      } = req.body;
      const loggedInUser = await userModel.findById(UserId);
      const pending_friend_request = await friendRequestModal.findById(
        frientRequestID
      );
      if (
        !pending_friend_request ||
        !loggedInUser ||
        !status.includes(frientRequestStatus)
      ) {
        return res.status(404).send({ message: "Please send all fields" });
      }
      if (
        frientRequestStatus === "accepted" &&
        pending_friend_request.frientRequestStatus === "pending"
      ) {
        // const acceptedFriendRequest = await friendRequestModal.findByIdAndUpdate(frientRequestID,
        //     { $set: { frientRequestStatus: frientRequestStatus } });
        //adding sender in the frientlist of receiver's
        const newlyAddedFriendDocForReceiver = new UserFriendList({
          user: pending_friend_request.requestReceiverID,
          friend_ID: pending_friend_request.frientRequestsenderID,
          friendName: requestSenderName,
          friend_dp: requestSenderDp,
        });
        const newlyAddedFriendDocForSender = new UserFriendList({
          user: pending_friend_request.frientRequestsenderID,
          friend_ID: pending_friend_request.requestReceiverID,
          friendName: requestReceiverName,
          friend_dp: requestReceivedDP,
        });
        await newlyAddedFriendDocForSender.save();
        const newlyAddedfriend = await newlyAddedFriendDocForReceiver.save();
        const acceptedFriendRequest =
          await friendRequestModal.findByIdAndRemove(frientRequestID);
        await FriendRequestNotificationsModal.findByIdAndRemove(
          notification_id
        );
        return res
          .status(200)
          .send({ newlyAddedfriend, acceptedFriendRequest });
      } else {
        return res.status(422).send({ message: "request already accepted" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).send("Internal server Error");
    }
  }
);

// get all Users

router.get("/all_users", authorization, async (req, res) => {
  const UserId = req.userId;
  // const { UserId } = req.body;
  const loggedInUser = await userModel.findById(UserId);
  if (loggedInUser) {
    const result = await userModel.find({});
    const all_users = result.filter((item) => item._id != UserId);
    res.status(200).send(all_users);
  } else {
    res.status(500).send("internal Server Error");
  }
});

//getFriend request Notification'
router.get("/get_notification_count", authorization, async (req, res) => {
  const UserId = req.userId;
  const noti = await FriendRequestNotificationsModal.find({ userID: UserId });
  if (!noti) {
    return res.status(401).send({ message: "No logged in user found" });
  }
  try {
    res.status(200).json({ notificationCount: noti.length, noti });
  } catch (error) {
    return res.status(500).send({ message: "Internal server error" });
  }
});

//get logged in User friends list
router.get("/get_logged_in_user_friends", authorization, async (req, res) => {
  try {
    const UserId = req.userId;
    const loggedInUser = await userModel.findById(UserId);
    if (!loggedInUser) {
      return res.status(401).send({ error: "No Logged in User found!" });
    }
    const friendList = await UserFriendList.find({ user: loggedInUser._id });
    const chatDetails = await messageModal.aggregate([
      //sorting the messages by timestamp in decending order
      {
        $sort: { createdAt: -1 },
      },
      // Step 2: Group by receiverId and keep the first message (latest one)
      {
        $group: {
          _id: "$receiverId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      // Step 3: Project the desired fields
      {
        $project: {
          _id: 0,
          chatId: "$lastMessage.chatId",
          senderId: "$lastMessage.senderId",
          receiverId: "$lastMessage.receiverId",
          senderDp: "$lastMessage.senderDp",
          text: "$lastMessage.text",
          createdAt: "$lastMessage.createdAt",
          updatedAt: "$lastMessage.updatedAt",
        },
      },
    ]);
    const matchedChats = [];

    chatDetails.forEach((chat) => {
      const friend = friendList.find(
        (item) => item.friend_ID === chat.receiverId
      );

      if (friend) {
        const mergedDetails = { ...chat, friend };
        matchedChats.push(mergedDetails);
      }
    });

    const cleanedResponse = matchedChats.map(obj => {
        // Create a new object with only the necessary fields
        const cleanedObj = {
            chatId: obj.chatId,
            senderId: obj.senderId,
            receiverId: obj.receiverId,
            senderDp: obj.senderDp,
            text: obj.text,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
            friend_ID:obj.friend.friend_ID && obj.friend.friend_ID,
            friendName:obj.friend.friendName && obj.friend.friendName,
            friend_dp:obj.friend.friend_dp && obj.friend.friend_dp

        };
        return cleanedObj;  
    });
    return res.status(200).json({ FriendList: cleanedResponse.length!==0 ? cleanedResponse : friendList });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "internal server Error", error });
  }
});

export default router;
