const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

// Email Template Schema
const emailTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String }, // Image URL
  createdAt: { type: Date, default: Date.now }
});

const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("uploads"));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

// API to get all email templates from MongoDB
app.get("/getEmailTemplates", async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).send("Error fetching templates");
  }
});

// Upload Image to Cloudinary
app.post("/uploadImage", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "email_templates",
      resource_type: "auto",
    });

    // Delete temporary file
    fs.unlink(req.file.path, (err) => err && console.error("Error deleting temp file:", err));

    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: "Error uploading image" });
  }
});

// API to save email template
app.post("/uploadEmailConfig", async (req, res) => {
  const { title, content, image } = req.body;
  try {
    const newTemplate = new EmailTemplate({ title, content, image });
    await newTemplate.save();
    res.send("Email template saved successfully");
  } catch (error) {
    console.error("Error saving email template:", error);
    res.status(500).send("Error saving email template");
  }
});

// API to render and download the template as HTML
app.post("/renderAndDownloadTemplate", (req, res) => {
  const { title, content, image } = req.body;
  const layout = `<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${content}</p>
        <img src="${image}" alt="Image" style="width: 300px;" />
      </body>
    </html>`;

  const downloadsDir = path.join(__dirname, "downloads");
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

  const outputPath = path.join(downloadsDir, "template.html");
  fs.writeFileSync(outputPath, layout);

  res.download(outputPath, "template.html", (err) => {
    if (err) console.error("Error sending file:", err);
  });
});

// API to update email template
app.put("/editEmailTemplate/:id", async (req, res) => {
  const { title, content, image } = req.body;
  try {
    const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      { title, content, image },
      { new: true }
    );
    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating email template:", error);
    res.status(500).send("Error updating email template");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
