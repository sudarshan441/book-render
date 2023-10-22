const express = require("express");
const bookModel = require("./book.model");
const paginate = require('express-paginate');
const bodyParser = require('body-parser');
const app = express.Router();
const jwt = require("jsonwebtoken");
const AWS = require('aws-sdk')
const multer = require('multer');
const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport


const UserModel = require("../user/user.model");
const upload = multer({ dest: 'uploads/' });
app.use(bodyParser.json());
app.use(paginate.middleware(10, 50));

AWS.config.update({
  secretAccessKey: process.env.ACCESS_SECRET,
  accessKeyId: process.env.ACCESS_KEY,
  region: process.env.REGION,

});

const BUCKET = process.env.BUCKET
const s3 = new AWS.S3();

app.post('/', upload.single('coverImage'), async (req, res) => {
 const {token} = req.headers;
    console.log(token);
  if (!token) {
    return res.status(404).send({ message: "token is required" });
  } else {
    try {
      verification = await jwt.verify(token, process.env.JWT_SECRET_KEY);
      console.log(verification);
      if (verification) {
        userData = await UserModel.findOne({ _id: verification._id })
        if (!userData) {
          return res.status(404).send({ message: 'user not found' });
        }
      }
    } catch (err) {
      console.log(err.message);
     return  res.status(404).send({ message: err.message });
     
    }
  }

  const { name, author, price, genre } = req.body;
  const coverImage = req.file;

  // Upload the image to AWS S3
  const params = {
    Bucket: BUCKET,
    Key: `${Date.now()}_${coverImage.originalname}`,
    Body: require('fs').createReadStream(coverImage.path),
  };

  s3.upload(params, async (err, data) => {
    if (err) {
      console.error('Error uploading to S3:', err);
      return res.status(500).json({ error: 'Failed to upload image to S3' });
    }

    try {
      let singleBook = await bookModel.create({
        Name: name,
        user: userData._id,
        ImageUrl: data.Location,
        ImageName: params.Key,
        Author: author,
        Genre: genre,
        Price: price
      });

      const transporter = nodemailer.createTransport({
        service: 'Gmail', // E.g., 'Gmail', 'Outlook', 'Yahoo', etc.
        auth: {
          user: 'sudarshanpujari6@gmail.com', // Your email address
          pass: process.env.GOOGLE_PASS // Your email password or an application-specific password
        }
      });
      
      // Email content
      const mailOptions = {
        from: 'sudarshanpujari6@gmail.com', // Sender's email address
        to: verification.email, // Recipient's email address
        subject: 'Your Book List',
        text: 'follow this link to to see your book listing. https://famous-daifuku-3ab17c.netlify.app/mybooks'
      };
      
      // Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent successfully');
          console.log('Email sent:', info.response);
        }
      });

      return res.status(200).send({ message: "ADDED", singleBook });
    } catch (er) {
      return res.status(404).send(er.message);
    }
    // Now, save book data (including the S3 image URL) to your database
    // Replace this with your database logic


    // Respond with a success message or book ID
  });
});

app.delete('/:id', async (req, res) => {
 
  const { token } = req.headers
  const { id } = req.params;
  

  if (!token) {
    return res.status(404).send({ message: "token is required" });
  } else {
    try {
      verification = await jwt.verify(token, process.env.JWT_SECRET_KEY);
      if (verification) {
        userData = await UserModel.findOne({ _id: verification._id })
        if (!userData) {
          console.log("userdata");
         return res.status(404).send({ message: 'user not found' });
        }
      }
    } catch (err) {
      console.log(err.message);
     return res.status(404).send({ message: err.message });
    }
  }

  try {
    exists = await bookModel.findOne({
      _id: id
    });
    if (!exists) {
    return  res.status(200).send("book not found");
    }
  } catch (e) {
    console.log(e,message);
   return res.send(e.massage);
  }
  // Get the image URL from the query parameters
  // Extract the object key from the image URL
  //.split(`${BUCKET}/`)[1];
  const objectKey = exists.ImageName;

  // Define parameters to delete the object
  const params = {
    Bucket: BUCKET,
    Key: objectKey
  };

  // Delete the object from S3
  s3.deleteObject(params, async(err, data) => {
    if (err) {
      console.error('Error deleting image from S3:', err);
      return res.status(500).json({ error: 'Failed to delete image from S3' });
    }

    // Image was deleted successfully
    try {
      let exists = await bookModel.findOneAndDelete({
        _id: id,
      });
  
      console.log(exists, req.params.id);
  
     return res.status(200).send("book deleted successfully");
    } catch (e) {
     return res.send(e.massage);
    }
  });
});

// Search, filter, and paginate books
// api----- /book?title=Harry%20Potter&page=2&perPage=20
app.get('/', async (req, res) => {
  
  try {
    const { name, sortBy, sortOrder, page, limit } = req.query;  
    console.log(name, sortBy, sortOrder, page, limit )

    const query = {};
    if (name) {
      query.Name = { $regex: name, $options: 'i' };
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit) || 10; // Default to 10 items per page

    const totalDocuments = await bookModel.countDocuments(query); // Count total documents
    const totalPages = Math.ceil(totalDocuments / limitValue);
    
    const books = await bookModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitValue)
      .exec();
   
   console.log(totalPages)
    res.json({totalPages,books});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete("/:id", async (req, res) => {
  console.log(req)
  try {
    let exists = await bookModel.findOneAndDelete({
      _id: req.params.id,
    });

    console.log(exists, req.params.id);

    res.status(200).send("book deleted successfully");
  } catch (e) {
    res.send(e.massage);
  }
});

app.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id)
  if (!id) {
    return res.status(403).send("MISSING ENTITES");
  }
  try {
    let singlData = await bookModel.findOne({ _id: id });
    console.log( singlData, req.params.id);
    if (!singlData) {
      return res.status(403).send("data not found");
    }
    return res.status(200).send(singlData);
  } catch (er) {
    return res.status(404).send(er.message);
  }
});

module.exports = app;