function doPost(e) {
  // --- CONFIGURATION ---
  const MY_SECRET = "CHANGE_THIS_TO_YOUR_PASSWORD"; 
  
  const LIKES_FOLDER_ID = "1wuK_Kz8jr4CT3Vj6Gnt_cBFIiCq4GBuS"; 
  const COMMENTS_FOLDER_ID = "1oYAGMkVg4hTxJ-XqOv8OfDMI29pGR4jF";

  try {
    // 1. Parse Data
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received");
    }
    const data = JSON.parse(e.postData.contents);

    // 2. Security Check
    if (data.secret !== MY_SECRET) {
      return ContentService.createTextOutput("Access Denied").setMimeType(ContentService.MimeType.TEXT);
    }

    // 3. Determine Folder and Filename
    let targetFolderId = LIKES_FOLDER_ID; // Default
    let fileName = "Untitled.md";
    let fileContent = "";

    if (data.type === 'reply') {
      targetFolderId = COMMENTS_FOLDER_ID;
      
      // Filename: FeedName_DDMMYYYY.md
      const rawFeedName = data.feedName ? String(data.feedName) : "Untitled";
      const safeFeedName = rawFeedName.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 50);
      
      // Robust Date Formatting
      const tz = Session.getScriptTimeZone();
      const dateStr = Utilities.formatDate(new Date(), tz, "ddMMyyyy");
      
      fileName = `${safeFeedName}_${dateStr}.md`;
      fileContent = data.comment ? String(data.comment) : "";

    } else {
      // Like (or anything else)
      targetFolderId = LIKES_FOLDER_ID;
      
      // Filename: PostTitle.md
      const rawTitle = data.postTitle ? String(data.postTitle) : "Untitled";
      // Allow letters, numbers, spaces, underscores, dashes
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\s-]/g, "").trim().substring(0, 50);
      
      fileName = (safeTitle || "Untitled") + ".md";
      
      // Tags handling
      let tagsVal = "[]";
      if (Array.isArray(data.tags)) {
        tagsVal = JSON.stringify(data.tags);
      }

      fileContent = "---\n" +
                    `post_id: ${data.postId || ""}\n` +
                    `tags: ${tagsVal}\n` +
                    "causes: []\n" +
                    "effects: []\n" +
                    "---\n" +
                    (data.postContent || "");
    }

    // 4. Save to Drive
    const folder = DriveApp.getFolderById(targetFolderId);
    folder.createFile(fileName, fileContent);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    // Return error message (though client might not see it in no-cors)
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}