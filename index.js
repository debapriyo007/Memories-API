require('dotenv').config();
const config = require('./config.json')
const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const upload = require('./multer');
const fs = require('fs')
const path = require('path')


const User = require('./models/user.model');
const MemoriesStory = require('./models/memorieStory.model');

const { authenticateToken } = require('./utlities');




mongoose.connect(config.connectionString)

const app = express();
app.use(express.json());
app.use(cors({origin:"*"}));



//create an Account
app.post("/create-account", async (req, res)=>{
    
    const {fullname, email, password} = req.body;
    if(!fullname || !email || !password){
        return res.status(400)
                .json({error : true,message: "All fields are required"})
    }

    const isUser = await User.findOne({email})
    if(isUser){
        return res.status(400)
                .json({error : true,message: "User already exists"})
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        fullname,
        email,
        password: hashedPassword
    })
    await user.save();

    const accessToken = jwt.sign(
        {userId:user._id},
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:"72h"
        }

    );
    return res.status(201).json({
        error:false,
        user:{
            fullname:user.fullname,
            email:user.email,
        },
        accessToken,
        message:"Registration successful",
    });
});

//Login
app.post("/login", async(req, res)=>{
    const {email, password} = req.body;

    if(!email || !password){
        return res.status(400)
                .json({error : true,message: "Email and Password are required"})
    }

    const user = await User.findOne({email});
    if(!user){
        return res.status(400)
                .json({message: "User does not exist!"})
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid){
        return res.status(400)
                .json({message: "Password is incorrect!"})
    }

    const accessToken = jwt.sign(
        {userId:user._id},
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:"72h"
        }
    );

    return res.json({
        error:false,
        message:"Login successful",
        user:{
            fullname:user.fullname,
            email:user.email,
        },
        accessToken,
    });
    
})


//get User
app.get("/get-user", authenticateToken,async(req, res)=>{
    const {userId} = req.user;
    
    const isUser = await User.findOne({_id:userId});
    if(!isUser){
        return res.sendStatus(401)
    }
    return res.json({
        user:isUser,
        message:"",
    });
})


// image upload api.
app.post("/image-upload", upload.single("image"), async(req, res)=>{
    try {
      if(!req.file){
          return res.status(400).json({error:true, message:"Image is required"});
      }
      const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
      return res.status(200).json({imageUrl});
  
    }catch(error){
      return res.status(500).json({error:true, message:error.message});
    }
})
  
//delete a image from upload folder.
app.delete("/delete-image", async(req, res)=>{
      const {imageUrl} = req.query;
      if(!imageUrl){
          return res.status(400).json({error:true, message:"Image url is required"});
      }
      try {
          //extract the file name from the image url.
          const filename = path.basename(imageUrl)
  
          //define the file path.
          const filePath = path.join(__dirname, "uploads", filename);
          //check if the file is exists.
          if(fs.existsSync(filePath)){
              //delete the file.
              fs.unlinkSync(filePath);
              return res.status(200).json({message:"Image deleted successfully"});
          }else{
              return res.status(200).json({error:true, message:"Image not found"});
          }
      } catch (error) {
          return res.status(500).json({error:true, message:error.message});
      }
})
  
//serve static file from the uploads folder .
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

//add memories story.
app.post("/add-memories-story", authenticateToken, async(req, res)=>{
    const {title, story,visitedLocation,imageUrl,visitedDate} = req.body;
    const {userId} = req.user;

    //valide the required fields
    if(!title || !story || !visitedLocation || !imageUrl || !visitedDate){
        return res.status(400)
                .json({error : true,message: "All fields are required"})
    }

    //convert visited date from millisecond to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate)); 
    try {
        const memorieStory = new MemoriesStory({
            title,
            story,
            visitedLocation,
            imageUrl,
            visitedDate:parsedVisitedDate,
            userId
        
        });
        await memorieStory.save();
        return res.status(201).json({
            story:memorieStory,
            message:"Added successfully",
        });
    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }
})

//get all memories..
app.get("/get-all-stories", authenticateToken, async(req, res)=>{
    const {userId} = req.user;
    try {
        const memoriesStory = await MemoriesStory.find({userId:userId}).sort({isFavourite:-1})
        res.status(200).json({stories:memoriesStory});
    } catch (error) {
        res.status(500).json({error:true, message:error.message});
    }
})

//edit a memories story.
app.put("/edit-story/:id", authenticateToken, async(req, res)=>{
    const {id} = req.params
    const {title, story,visitedLocation,imageUrl,visitedDate} = req.body;
    const {userId} = req.user

     //valide the required fields
    if(!title || !story || !visitedLocation || !visitedDate){
        return res.status(400)
                  .json({error : true,message: "All fields are required"})
    }
    
    //convert visited date from millisecond to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate));

    try {
        //find the merories story by ID and ensure that it belong from authenticated user.
        const memoriesStory = await MemoriesStory.findOne({_id:id, userId:userId});
        if(!memoriesStory){
            return res.status(404).json({error:true, message:"Story not found"});
        }
        const placeholderImgUrl =  `http://localhost:8000/assets/placeholder.png`;
        //update the memories story.
        memoriesStory.title = title;
        memoriesStory.story = story;
        memoriesStory.visitedLocation = visitedLocation;
        memoriesStory.imageUrl = imageUrl || placeholderImgUrl;
        memoriesStory.visitedDate = parsedVisitedDate;
        await memoriesStory.save();
        return res.status(200).json({story:memoriesStory, message:"Updated successfully"});

    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }
    

})

//delete the memories story.
app.delete("/delete-story/:id", authenticateToken, async(req, res)=>{
    const {id} = req.params;
    const {userId} = req.user;

    try {
        //find the merories story by ID and ensure that it belong from authenticated user.
        const memoriesStory = await MemoriesStory.findOne({_id:id, userId:userId});
        if(!memoriesStory){
            return res.status(404).json({error:true, message:"Story not found"});
        }

        //delete the memories story from the database.
        await memoriesStory.deleteOne({_id:id, userId:userId})

        //extract the file name from the imageurl.
        const imageUrl = memoriesStory.imageUrl
        const filename = path.basename(imageUrl)

        //define the file path.
        const filePath = path.join(__dirname, "uploads", filename);

        //delete the file from the uploads folder.
        fs.unlink(filePath,(err)=>{
            if(err){
                console.error("Failed to delete the file", err);
                //Optinallly,return status here.

            }
            
        });
        return res.status(200).json({message:"Memory Story deleted successfully"});

    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }
})

//update the isFavourite field of a memories story.
app.put("/update-is-favourite/:id", authenticateToken, async(req, res)=>{
    const {id} = req.params;
    const {isFavourite} = req.body;
    const {userId} = req.user;

    try {
        //find the merories story by ID and ensure that it belong from authenticated user.
        const memoriesStory = await MemoriesStory.findOne({_id:id, userId:userId});
        if(!memoriesStory){
            return res.status(404).json({error:true, message:"Story not found"});
        }

        //update the isFavourite field.
        memoriesStory.isFavourite = isFavourite;
        await memoriesStory.save();
        return res.status(200).json({story:memoriesStory, message:"Updated successfully"});

    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }
})

//search memories story 
app.get("/search", authenticateToken, async(req, res)=>{
    const {query} = req.query;
    const {userId} = req.user

    if(!query){
        return res.status(404).json({error:true, message:"query is required!"})
    }

    try {
        const searchResult = await MemoriesStory.find({
            userId:userId,
            $or:[
                {title:{$regex:query, $options:"i"}},
                {story:{$regex:query, $options:"i"}},
                {visitedLocation:{$regex:query, $options:"i"}},
            ],
        }).sort({isFavourite:-1});

        return res.status(200).json({stories:searchResult});
    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }
})


//filter the memories story by  date.
app.get("/memories/filter", authenticateToken, async(req, res)=>{
    const {startDate, endDate} = req.query;
    const {userId} = req.user;

    try {
      //convert the startDate and endDate to millseconds to date object.
      const parsedStartDate = new Date(parseInt(startDate));
      const parsedEndDate = new Date(parseInt(endDate));
      
      //find the memories that belong between that range of date.
      const filterStories = await MemoriesStory.find({
            userId:userId,
            visitedDate:{
                $gte:parsedStartDate,
                $lte:parsedEndDate,
            }
      }).sort({isFavourite:-1});

      return res.status(200).json({stories:filterStories});
    } catch (error) {
        return res.status(500).json({error:true, message:error.message});
    }

})


app.listen(8000, ()=>{
    console.log("Server is running on port 8000");
});
module.exports = app;