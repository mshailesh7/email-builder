import React, { useState, useEffect } from "react";
import axios from "axios";

const EmailBuilder = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [templates, setTemplates] = useState([]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(
        "https://email-builder-backend-fkiu.onrender.com/getEmailTemplates"
      );
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleImageUpload = async (e) => {
    if (!e.target.files[0]) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", e.target.files[0]);

    try {
      const response = await axios.post(
        "https://email-builder-backend-fkiu.onrender.com/uploadImage",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const uploadedImageUrl = response.data.imageUrl || response.data;
      setImageUrl(uploadedImageUrl);
      console.log("Image URL set:", uploadedImageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplateId(template._id);
    setTitle(template.title);
    setContent(template.content);
    setImageUrl(template.image);
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      alert("Please fill in all required fields");
      return;
    }

    const emailConfig = { title, content, image: imageUrl };

    try {
      if (editingTemplateId) {
        await axios.put(
          `https://email-builder-backend-fkiu.onrender.com/editEmailTemplate/${editingTemplateId}`,
          emailConfig
        );
      } else {
        await axios.post(
          "https://email-builder-backend-fkiu.onrender.com/uploadEmailConfig",
          emailConfig
        );
      }

      await fetchTemplates();
      resetForm();
      alert(
        `Email template ${
          editingTemplateId ? "updated" : "saved"
        } successfully!`
      );
    } catch (error) {
      console.error("Error saving email template:", error);
      alert("Error saving template");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageUrl("");
    setEditingTemplateId(null);
  };

  const handleDownload = async (template) => {
    try {
      const response = await axios.post(
        "https://email-builder-backend-fkiu.onrender.com/renderAndDownloadTemplate",
        template,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "template.html");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Error downloading template");
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Builder</h1>
      <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm mb-8">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full rounded"
          required
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-2 w-full h-32 rounded"
          required
        />
        <div className="space-y-2">
          <input
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="mb-2"
          />
          {isUploading && (
            <div className="text-blue-500">Uploading image...</div>
          )}
          {imageUrl && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Image Preview:</h3>
              <img
                src={imageUrl}
                alt="Template preview"
                className="max-w-md h-auto rounded shadow-sm"
                onError={(e) => {
                  e.target.src = "/api/placeholder/400/300";
                }}
              />
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isUploading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {editingTemplateId ? "Update Template" : "Save Template"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template._id}
            className="border rounded-lg p-4 bg-white shadow-sm"
          >
            <h2 className="font-bold text-lg mb-2">{template.title}</h2>
            <p className="text-gray-600 mb-4">{template.content}</p>
            {template.image && (
              <div className="mb-4">
                <img
                  src={template.image}
                  alt={template.title}
                  className="w-full h-48 object-cover rounded"
                  onError={(e) => {
                    e.target.src = "/api/placeholder/400/300";
                  }}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(template)}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDownload(template)}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailBuilder;
