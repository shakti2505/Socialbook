import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import express from "express";
import userModel from "../models/user.js";
import displayPictureModel from "../models/displayPictures.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import { authorization } from "../middleware/AuthMiddleware.js";
import friendRequestModal from "../models/FrientRequest.js";
import postModel from "../models/Post.js";
import FriendRequestNotificationsModal from "../models/Notifications/FriendRequestNotificaitons.js";
import SubscriptionModel from "../models/SubscriptionSchema.js";
import PostNotificationModal from "../models/Notifications/PostNotification.js";
import notificationMethod from "../Services/Notifications/UserSpecificNotification.js";
import { transport } from "../Services/utilities/nodemail.js";
const router = express.Router();
const storage = multer.memoryStorage();
const uploadDP = multer({
  storage: storage,
  limits: { fileSize: 300 * 300 * 2 },
});

//token
const maxAge = 3 * 60 * 60;
const creatToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: maxAge,
  });
};

const sendMail = async (mailOptions) => {
  let info = await transport.sendMail(mailOptions);
  return info;
};

//update User Profile picture
router.put("/updateUserProfilePicture", authorization, async (req, res) => {
  const UserId = req.userId;

  const { profilePic } = req.body;

  const loggedInUser = await userModel.findById(UserId);
  if (!loggedInUser) {
    res.status(400).send("No User found to update");
  }
  try {
    const updateUserInfo = await userModel.findByIdAndUpdate(UserId, {
      profilePic: profilePic,
      livesIn: livesIn,
      city: city,
      state: State,
      country: country,
      highSchool: highSchool,
      college: college,
      relationShipStatus: relationShipStatus,
      hobbies: hobbies,
      likes: likes,
      dislikes: dislikes,
      bio: bio,
    });
    const updatedUser = await updateUserInfo.save();
    res.status(201).send(updatedUser);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// update User
router.put("/updateUserInfo", authorization, async (req, res) => {
  const UserId = req.userId;
  const {
    profilePic,
    livesIn,
    city,
    State,
    country,
    highSchool,
    college,
    relationShipStatus,
    hobbies,
    likes,
    dislikes,
    bio,
  } = req.body;
  const loggedInUser = await userModel.findById(UserId);
  if (!loggedInUser) {
    res.status(400).send("No User found to update");
  }
  try {
    let profilePicture;
    profilePic &&
      profilePic.map((item) => {
        profilePicture = item;
      });
    const updateUserInfo = await userModel.findByIdAndUpdate(UserId, {
      profilePic: profilePicture,
      livesIn: livesIn,
      city: city,
      state: State,
      country: country,
      highSchool: highSchool,
      college: college,
      relationShipStatus: relationShipStatus,
      hobbies: hobbies,
      likes: likes,
      dislikes: dislikes,
      bio: bio,
    });
    const updatedUser = await updateUserInfo.save();
    // await monitorRequests(userModel);
    return res.status(201).send(updatedUser);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
});

//create User
router.post("/createUser", async (req, res) => {
  try {
    const {
      fname,
      Surname,
      MobileOrEmail,
      gender,
      days,
      months,
      years,
      password,
    } = req.body;
    let email;
    let mobileNumber;
    if (MobileOrEmail.slice(-4) === ".com") {
      email = MobileOrEmail;
    } else {
      mobileNumber = MobileOrEmail;
    }

    const existingUser = await userModel.findOne({ email: email });
    const hashPassword = await bcrypt.hash(password, 10);

    if (existingUser == null) {
      const newUser = new userModel({
        firstName: fname,
        LastName: Surname,
        email: email ? email : "",
        phone: mobileNumber ? mobileNumber : "",
        gender: gender,
        DateOfBirth: `${days}/${months}/${years}`,
        password: hashPassword,
      });
      const savedUser = await newUser.save();
      let user = {
        name: savedUser.firstName + " " + savedUser.LastName,
        email: savedUser.email,
        _Id: savedUser._id,
      };
      const token = creatToken(user._id);
      res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });

      return res
        .status(201)
        .json({ success: true, message: "account creation successfull", user });
    } else {
      return res.status(200).json({ message: "Email already exist!" });
    }
  } catch (error) {
    return res.status(500).json({ errorMsg: "Internal server error" });
  }
});

//login
// router.post('/login', async (req, res) => {
//     const { email, phone, password } = req.body
//     const searchCriteria = {
//         $or: [
//             { email: email },
//             { phone: phone }
//         ],
//     }
//     const existingUser = await userModel.findOne(searchCriteria)
//     if (existingUser==null || undefined) {
//         res.status(404).send({ success: false, message: "email not found" })
//     }
//     try {
//         const passMatch = await bcrypt.compare(password, existingUser.password)
//         if (existingUser.email == email || existingUser.phone == phone && passMatch) {
//             const token = creatToken(existingUser._id)
//             res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 })
//             const loggedInUser = {
//                 firstName: existingUser.firstName,
//                 LastName: existingUser.LastName,
//                 DOB: existingUser.DateOfBirth,
//             }
//             res.status(200).send({ success: true, message: "Login successfull!", loggedInUser })
//         } else {
//             res.status(401).send({ success: false, message: "Unauthorized Access" })
//         }

//     } catch (error) {
//         console.log(error)
//     }
// });

//login
router.post("/login", async (req, res) => {
  const { email, phone, password } = req.body;

  // Check if either email or phone `is` provided
  if (!email && !phone) {
    return res
      .status(401)
      .json({ success: false, message: "Email or phone is required" });
  }
  try {
    let searchCriteria = {};
    if (email) searchCriteria.email = email;
    if (phone) searchCriteria.phone = phone;

    const existingUser = await userModel.findOne(searchCriteria);
    // Check if user exists
    if (!existingUser) {
      return res.status(401).json({ message: "Email not found!" });
    }

    // Compare passwords
    const passMatch = await bcrypt.compare(password, existingUser.password);
    const notification = await FriendRequestNotificationsModal.find({
      userID: existingUser._id,
    });
    const PostNotification = await PostNotificationModal.find({
      userID: existingUser._id,
    });
    const subscription = await SubscriptionModel.find({
      user: existingUser._id,
    });

    if (passMatch) {
      // Destructure existingUser for simplicity
      const { firstName, LastName, DateOfBirth, email, _id, profilePic } =
        existingUser;
      // Create token
      const token = creatToken(existingUser._id);
      // Set JWT token in cookie
      res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
      if (notification.length !== 0 && subscription.length !== 0) {
        notificationMethod.SendFriendRequestNotification(existingUser._id);
      }
      if (PostNotification.length !== 0 && subscription.length !== 0) {
        notificationMethod.sendPostUploadNotification(existingUser._id);
      }
      return res.status(200).json({
        success: true,
        message: "Login successful!",
        loggedInUser: {
          firstName,
          LastName,
          DateOfBirth,
          email,
          _id,
          profilePic,
          subscription: subscription.length !== 0 ? true : false,
        },
      });
    } else {
      return res.status(401).json({ message: "Invalid Credentials" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

//logout
router.get("/logout", authorization, async (req, res) => {
  const UserId = req.userId;
  const loggedInUser = await userModel.findById(UserId);
  if (loggedInUser) {
    res.cookie("jwt", "", { expires: new Date(0) });
    res.status(200).send({ message: "logot Successfully" });
  } else {
    res.status(500).send({ message: "Internal Server Error" });
  }
});

//uplaod DP
router.post("/upload-dp", async (req, res) => {
  // const UserId = req.userId
  const { displayPictureUrl, UserId } = req.body;
  let dpUrl;
  displayPictureUrl.map((item) => {
    dpUrl = item;
  });
  try {
    if (!displayPictureUrl) {
      res.json({
        success: "false",
        message: "You must provide at leats 1 file",
      });
    } else {
      const uploadObject = new displayPictureModel({
        displayPictureUrl: dpUrl,
        users: UserId,
      });
      const uploadProcess = await uploadObject.save();
      res.status(201).json({
        success: true,
        message: "upload successfull",
        obj: uploadProcess,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.get("/getLoggedInUserData", authorization, async (req, res) => {
  const userID = req.userId;
  // const {userID} = req.body;
  const loggedInUser = await userModel
    .findById(userID)
    .select("-phone -email -password");
  if (loggedInUser) {
    return res.status(200).send({ success: true, loggedInUser });
  } else {
    return res
      .status(401)
      .send({ success: false, message: "Unauthroriazied access" });
  }
});

router.get("/get_specificUserData", authorization, async (req, res) => {
  try {
    const userID = req.userId;
    const { username } = req.query;
    console.log(username);
    const specificUser = await userModel.findById(username).select("-password");
    const loggedInUser = await userModel.findById(userID);
    if (loggedInUser && specificUser) {
      return res.status(200).json({ success: true, specificUser });
    } else {
      return res
        .status(401)
        .send({ success: false, message: "Permission denied" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/user_profiel_picture", authorization, async (req, res) => {
  const userID = req.userId;
  try {
    const UserProfilePicture = await displayPictureModel.find({
      users: userID,
    });
    if (!UserProfilePicture) {
      return res.status(404).send("Image not found");
    } else {
      res.status(200).send({ UserProfilePicture });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.post("/forgotpassword", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await userModel.find({ email: email });
    if (existingUser !== null) {
      const otp = Math.floor(1000 + Math.random() * 9000);
      await userModel.findByIdAndUpdate(existingUser[0]._id, {
        isVerified: true,
        otp: otp,
      });
      // sending otp to the mail ID of the user
      const mailOptions = {
        from: {
          name: "Socialbook",
          address: process.env.user,
        },
        to: email,
        subject: "OTP for to reset password",
        text: `Hi ${existingUser[0].firstName}`,
        html: `<b> your OTP to create the new password is ${otp}. </b>`,
      };

      const sentMail = await sendMail(mailOptions);

      if (sentMail.messageId !== undefined) {
        const token = creatToken(existingUser[0]._id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ message: `OTP sent`, email: email });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verifyOtp", authorization, async (req, res) => {
  try {
    const userID = req.userId;
    const { otp1, otp2, otp3, otp4 } = req.body;
    let OTP = otp1.concat(otp2, otp3, otp4);
    console.log(OTP);
    const requestiee = await userModel.findById(userID);
    if (!OTP) {
      return res.status(401).json({ message: "OTP is required" });
    }
    if (requestiee.isVerified && requestiee.otp == OTP) {
      console.log("OTP verification successfull");
      return res.status(200).json({ message: "OTP verfication successfull" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
});

router.post("/resetpassword", authorization, async (req, res) => {
  try {
    const { password1, password2 } = req.body;
    const userID = req.userId;
    if (!password1 || !password2) {
      return res.status(401).json({ message: "All fields are required!" });
    }
    const hashPassword = await bcrypt.hash(password1, 10);
    await userModel.findByIdAndUpdate(userID, { password: hashPassword });
    return res.status(200).json({ message: "Password reset completed" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/change-account-type", authorization, async (req, res) => {
  try {
    const userID = req.userId;
    const { accountType } = req.body;
    await userModel.findByIdAndUpdate(userID, { accountType: accountType });
    res
      .status(200)
      .json({ message: `account switched to ${accountType} successfully!` });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

export default router;
