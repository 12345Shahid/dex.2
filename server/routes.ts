import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateResponse } from "./ai";
import { insertChatSchema, insertContactSchema, insertFileSchema, insertFolderSchema } from "@shared/schema";
import { supabase } from "./supabase";
import passport from "passport";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // AI Chat endpoints
  app.post("/api/chat", async (req, res) => {
    console.log('Received chat request:', req.body);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertChatSchema.safeParse(req.body);
    if (!result.success) {
      console.error('Chat validation error:', result.error);
      return res.status(400).json(result.error);
    }

    const user = req.user!;
    if (user.credits < 1) {
      console.log('User has insufficient credits:', user);
      return res.status(402).json({ message: "Insufficient credits" });
    }

    try {
      console.log('Generating response...');
      const response = await generateResponse({
        prompt: result.data.prompt
      });
      console.log('Response generated successfully');

      // Try to deduct credits, but don't fail if it doesn't work
      try {
        await storage.addUserCredits(user.id, -1);
        console.log('Credits deducted from user');
        
        // Get the updated user credits after deduction
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser) {
          // Update the user object in session for future requests
          req.user = updatedUser;
          
          res.json({
            response: response,
            creditsRemaining: updatedUser.credits,
          });
        } else {
          // Fallback to the original behavior if we can't get updated user
          res.json({
            response: response,
            creditsRemaining: user.credits - 1,
          });
        }
      } catch (creditError) {
        console.error('Failed to deduct credits:', creditError);
        // Continue without failing the entire request
        res.json({
          response: response,
          creditsRemaining: user.credits - 1,
        });
      }

      // Try to save chat history, but don't fail if it doesn't work
      try {
        await storage.saveChatHistory(user.id, result.data.prompt, response);
        console.log('Chat history saved');
      } catch (historyError) {
        console.error('Failed to save chat history:', historyError);
        // Continue without failing the entire request
      }
    } catch (error) {
      console.error('Chat generation error:', error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Chat history endpoints
  app.get("/api/chat/history", async (req, res) => {
    console.log('Retrieving chat history');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const history = await storage.getUserChatHistory(req.user!.id);
      res.json(history);
    } catch (error) {
      console.error('Failed to retrieve chat history:', error);
      res.status(500).json({ message: "Failed to retrieve chat history" });
    }
  });

  app.get("/api/chat/favorites", async (req, res) => {
    console.log('Retrieving favorite chat history');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const favorites = await storage.getFavoriteChatHistory(req.user!.id);
      res.json(favorites);
    } catch (error) {
      console.error('Failed to retrieve favorite chat history:', error);
      res.status(500).json({ message: "Failed to retrieve favorite chat history" });
    }
  });

  app.post("/api/chat/:id/favorite", async (req, res) => {
    console.log('Toggling favorite status for chat');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const chatId = parseInt(req.params.id);
    const { isFavorite } = req.body;

    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    try {
      await storage.toggleFavoriteChat(chatId, isFavorite);
      res.sendStatus(200);
    } catch (error) {
      console.error('Failed to toggle favorite status:', error);
      res.status(500).json({ message: "Failed to toggle favorite status" });
    }
  });

  // File management endpoints
  app.post("/api/files", async (req, res) => {
    console.log('Received file creation request:', req.body);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertFileSchema.safeParse(req.body);
    if (!result.success) {
      console.error('File validation error:', result.error);
      return res.status(400).json(result.error);
    }

    try {
      console.log('Creating file...');
      const file = await storage.createFile(
        req.user!.id,
        result.data.name,
        result.data.content,
        result.data.folderId
      );
      console.log('File created successfully:', file);
      res.json(file);
    } catch (error) {
      console.error('File creation error:', error);
      res.status(500).json({ message: "Failed to create file" });
    }
  });

  // Move the search endpoint before the :id parameter route
  app.get("/api/files/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = typeof req.query.q === 'string' ? req.query.q : '';
    console.log(`Search query: "${query}" (${query ? 'searching' : 'listing all'})`);

    try {
      // Get both files and folders
      const files = await storage.searchFiles(req.user!.id, query);
      console.log(`Search results: ${files.length} items found`);
      res.json(files);
    } catch (error) {
      console.error('File search error:', error);
      res.status(500).json({ message: "Failed to search files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    console.log('Retrieving file with ID:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    try {
      const file = await storage.getFile(fileId, req.user!.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error('File retrieval error:', error);
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });

  app.put("/api/files/:id", async (req, res) => {
    console.log('Updating file with ID:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    try {
      const updatedFile = await storage.updateFile(fileId, req.user!.id, req.body);
      res.json(updatedFile);
    } catch (error) {
      console.error('File update error:', error);
      if (error.message?.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    console.log('Deleting file with ID:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    try {
      await storage.deleteFile(fileId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('File deletion error:', error);
      if (error.message?.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/files/:id/move", async (req, res) => {
    console.log('Moving file with ID:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    const { folderId } = req.body;
    if (folderId !== null && isNaN(parseInt(folderId))) {
      return res.status(400).json({ message: "Invalid folder ID" });
    }

    try {
      const updatedFile = await storage.moveFile(
        fileId, 
        req.user!.id, 
        folderId === null ? null : parseInt(folderId)
      );
      res.json(updatedFile);
    } catch (error) {
      console.error('File move error:', error);
      if (error.message?.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to move file" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    console.log('Received folder creation request:', req.body);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertFolderSchema.safeParse(req.body);
    if (!result.success) {
      console.error('Folder validation error:', result.error);
      return res.status(400).json(result.error);
    }

    try {
      console.log('Creating folder...');
      const folder = await storage.createFolder(req.user!.id, result.data.name);
      console.log('Folder created successfully:', folder);
      res.json(folder);
    } catch (error) {
      console.error('Folder creation error:', error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.get("/api/folders/:id/contents", async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      const userId = req.user.id;
      
      console.log(`Retrieving contents of folder with ID: ${folderId}`);
      
      // Get files in the folder
      try {
        const { data: files, error: filesError } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', userId)
          .eq('folder_id', folderId);
        
        if (filesError) {
          console.error('Failed to get files in folder:', filesError);
          // Check for specific database schema errors
          if (filesError.code === '42703') {
            return res.status(503).json({
              message: "Database schema update required. Please contact an administrator to run the database fix script.",
              details: filesError.message,
              errorCode: "SCHEMA_ERROR"
            });
          }
          throw filesError;
        }
        
        // Get subfolders in the folder
        try {
          const { data: folders, error: foldersError } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .eq('parent_id', folderId);
          
          if (foldersError) {
            console.error('Failed to get subfolders:', foldersError);
            // Check for specific database schema errors
            if (foldersError.code === '42703') {
              return res.status(503).json({
                message: "Database schema update required. Please contact an administrator to run the database fix script.",
                details: foldersError.message,
                errorCode: "SCHEMA_ERROR"
              });
            }
            throw foldersError;
          }
          
          // Get the current folder details
          const { data: currentFolder, error: folderError } = await supabase
            .from('folders')
            .select('name')
            .eq('id', folderId)
            .eq('user_id', userId)
            .single();
            
          if (folderError) {
            console.error('Failed to get folder details:', folderError);
            throw folderError;
          }
          
          res.json({ 
            files: files || [], 
            folders: folders || [],
            name: currentFolder?.name || 'Unknown Folder'
          });
        } catch (subfoldersError) {
          console.error('Folder contents retrieval error:', subfoldersError);
          res.status(500).json({ message: 'Failed to retrieve folder contents', error: subfoldersError });
        }
      } catch (filesError) {
        console.error('Folder contents retrieval error:', filesError);
        res.status(500).json({ message: 'Failed to retrieve folder contents', error: filesError });
      }
    } catch (err) {
      console.error('Folder contents retrieval error:', err);
      res.status(500).json({ message: 'Failed to retrieve folder contents', error: err });
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    console.log('Deleting folder with ID:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const folderId = parseInt(req.params.id);
    if (isNaN(folderId)) {
      return res.status(400).json({ message: "Invalid folder ID" });
    }

    try {
      await storage.deleteFolder(folderId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Folder deletion error:', error);
      if (error.message?.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes("Cannot delete folder with files")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  app.get("/api/folders", async (req, res) => {
    console.log('Retrieving all user folders');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const folders = await storage.getUserFolders(req.user!.id);
      res.json(folders);
    } catch (error) {
      console.error('Folders retrieval error:', error);
      res.status(500).json({ message: "Failed to retrieve folders" });
    }
  });

  app.get("/api/files", async (req, res) => {
    console.log('Retrieving all root files');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const files = await storage.getUserRootFiles(req.user!.id);
      res.json(files);
    } catch (error) {
      console.error('Files retrieval error:', error);
      res.status(500).json({ message: "Failed to retrieve files" });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    const result = insertContactSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    try {
      await storage.createContact(result.data);
      res.sendStatus(200);
    } catch (error) {
      console.error('Contact creation error:', error);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Add a referral credits endpoint
  app.get("/api/user/referral-credits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get all users who were referred by the current user
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("referred_by", req.user!.id);
        
      if (error) throw error;
      
      // Return the count (this approximates referral credits earned)
      res.json({ count: data ? data.length : 0 });
    } catch (error) {
      console.error("Failed to get referral credits:", error);
      res.status(500).json({ message: "Failed to get referral credits" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to get notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });
  
  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      await storage.markNotificationsAsRead(req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  app.post("/api/files/:id/favorite", async (req, res) => {
    console.log('Toggling favorite status for file');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    try {
      const { isFavorite } = req.body;
      
      if (typeof isFavorite !== 'boolean') {
        return res.status(400).json({ message: "isFavorite must be a boolean" });
      }

      // Check that the file exists and belongs to the user
      const file = await storage.getFile(fileId, req.user!.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      await storage.toggleFavoriteFile(fileId, isFavorite);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to toggle file favorite status:', error);
      res.status(500).json({ message: "Failed to toggle favorite status" });
    }
  });

  app.get("/api/files/favorites", async (req, res) => {
    console.log('Retrieving favorite files');
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const favorites = await storage.getFavoriteFiles(req.user!.id);
      res.json(favorites);
    } catch (error) {
      console.error('Failed to retrieve favorite files:', error);
      res.status(500).json({ message: "Failed to retrieve favorite files" });
    }
  });

  // Add share endpoint
  app.post("/api/files/:id/share", async (req, res) => {
    console.log('Generating share ID for file:', req.params.id);
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const fileId = parseInt(req.params.id);
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }

    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Check that the file exists and belongs to the user
      const file = await storage.getFile(fileId, req.user.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Generate a unique share ID
      const shareId = await storage.generateShareId(fileId);
      res.json({ shareId });
    } catch (error) {
      console.error('Failed to generate share ID:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to generate share ID" });
    }
  });

  // Add shared file endpoint
  app.get("/api/shared-files/:shareId", async (req, res) => {
    console.log('Accessing shared file with share ID:', req.params.shareId);

    const shareId = req.params.shareId;
    if (!shareId || typeof shareId !== 'string') {
      return res.status(400).json({ message: "Share ID is required" });
    }

    try {
      const file = await storage.getFileByShareId(shareId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      console.error('Failed to retrieve shared file:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to retrieve shared file" });
    }
  });

  // Add shared file route handler
  app.get("/shared-file/:shareId", (req, res) => {
    console.log('Serving shared file route:', req.params.shareId);
    const clientPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "../client/index.html"
    );
    res.sendFile(clientPath);
  });

  app.post("/api/login", (req, res, next) => {
    // Add a log for debugging login attempts
    console.log(`Login attempt for username: ${req.body.username || 'unknown'}`);

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log(`Login failed for user: ${req.body.username || 'unknown'}`);
        return res.status(401).json({ 
          message: "Login failed. Please check your username and password.", 
          status: "error" 
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        
        console.log(`User logged in successfully: ${user.username} (ID: ${user.id})`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Check database connection
      const { error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        console.error('Health check failed:', error);
        return res.status(503).json({ 
          status: 'error', 
          message: 'Database connection issues. Our team has been notified.',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
      
      // Include schema issues if any
      const schemaIssues = global.schemaIssues || [];
      const schemaStatus = schemaIssues.length === 0 ? 'ok' : 'warning';
      
      // All checks passed
      res.json({ 
        status: 'ok',
        schemaStatus,
        schemaIssues: process.env.NODE_ENV === 'development' ? schemaIssues : undefined,
        message: schemaIssues.length > 0 
          ? 'Server is healthy, but database schema needs updates. Some features may not work correctly.'
          : 'Server is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Health check error:', err);
      res.status(500).json({ 
        status: 'error', 
        message: 'Server is experiencing issues. Please try again later.'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}