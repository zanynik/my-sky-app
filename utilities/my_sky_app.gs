function doPost(e) {
  // --- CONFIGURATION ---
  const MY_SECRET = "CHANGE_THIS_TO_YOUR_PASSWORD"; 
  
  // You need TWO distinct folder IDs now
  const LIKES_FOLDER_ID = "1wuK_Kz8jr4CT3Vj6Gnt_cBFIiCq4GBuS"; 
  const COMMENTS_FOLDER_ID = "1oYAGMkVg4hTxJ-XqOv8OfDMI29pGR4jF";

  // --- LOGIC ---
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Security Check
    if (data.secret !== MY_SECRET) {
      return ContentService.createTextOutput("Access Denied").setMimeType(ContentService.MimeType.TEXT);
    }

    // 2. Select the correct folder
    let targetFolderId;
    if (data.type === 'like') {
      targetFolderId = LIKES_FOLDER_ID;
    } else if (data.type === 'reply') { // We use 'reply' for comments
      targetFolderId = COMMENTS_FOLDER_ID;
    } else {
      // Fallback if something else comes in
      targetFolderId = LIKES_FOLDER_ID; 
    }
    
    const folder = DriveApp.getFolderById(targetFolderId);

    // 3. Generate Content & Filename based on Type
    let fileName, fileContent;

    if (data.type === 'reply') {
      // --- REPLY FORMAT ---
      // Filename: "FeedName_DDMMYYYY.md"
      const safeFeedName = (data.feedName || "Untitled")
        .replace(/[^a-zA-Z0-9_]/g, "") 
        .substring(0, 50);             
      
      const timestamp = new Date().toLocaleDateString("en-GB").replace(/\//g, ""); 
      fileName = `${safeFeedName}_${timestamp}.md`;
      
      // Content: Just the comment
      fileContent = data.comment || "";

    } else {
      // --- LIKE FORMAT ---
      // Filename: "PostTitle.md"
      const safeTitle = (data.postTitle || "Untitled")
        .replace(/[^a-zA-Z0-9_\s-]/g, "") // Allow spaces for title
        .trim()
        .substring(0, 50);
      
      fileName = `${safeTitle}.md`;

      // Content: Metadata + Post Content
      // Empty fields for causes and effects as requested
      const tagsString = Array.isArray(data.tags) ? JSON.stringify(data.tags) : "[]";
      
      fileContent = `---
post_id: ${data.postId}
tags: ${tagsString}
causes: []
effects: []
---
${data.postContent}
`;
    }

    folder.createFile(fileName, fileContent);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}