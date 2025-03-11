import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { validatePrompt, generateResponse } from "./ai";
import { insertChatSchema, insertContactSchema, insertFileSchema, insertFolderSchema } from "@shared/schema";

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

    const validation = await validatePrompt(result.data.prompt);
    if (!validation.isHalal) {
      console.log('Non-halal content detected:', validation.reason);
      return res.status(400).json({ message: validation.reason });
    }

    try {
      console.log('Generating AI response...');
      const response = await generateResponse(req.body);
      console.log('Saving chat history...');
      const chat = await storage.saveChatHistory(user.id, result.data.prompt, response);
      console.log('Deducting credits...');
      await storage.addUserCredits(user.id, -1);
      res.json(chat);
    } catch (error) {
      console.error('Chat generation error:', error);
      res.status(500).json({ message: "Failed to generate response" });
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

  app.get("/api/files/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (!query) return res.status(400).json({ message: "Search query required" });

    try {
      const files = await storage.searchFiles(req.user!.id, query);
      res.json(files);
    } catch (error) {
      console.error('File search error:', error);
      res.status(500).json({ message: "Failed to search files" });
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

  const httpServer = createServer(app);
  return httpServer;
}