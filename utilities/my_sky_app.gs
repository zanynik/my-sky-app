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

    // 3. Generate Filename: "FeedName_DDMMYYYY.md"
    // We sanitize the feed name to ensure safe filename
    const safeFeedName = (data.feedName || "Untitled")
      .replace(/[^a-zA-Z0-9_]/g, "") // Keep alphanumeric and underscores
      .substring(0, 50);             
      
    // Date format DDMMYYYY
    const timestamp = new Date().toLocaleDateString("en-GB").replace(/\//g, ""); 
    const fileName = `${safeFeedName}_${timestamp}.md`;

    // 4. Create Content
    const fileContent = `---
post_id: ${data.postId}
title: ${data.postTitle}
---
${data.postContent}

${data.comment || ""}
`;

    folder.createFile(fileName, fileContent);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}