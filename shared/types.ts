import { z } from "zod";

// Basic schemas without server dependencies
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  credits: z.number(),
  referralCode: z.string().optional(),
  referredBy: z.number().optional(),
});

export const chatHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  prompt: z.string(),
  response: z.string(),
  isFavorite: z.boolean(),
  createdAt: z.date(),
});

export const fileSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  content: z.string().optional(),
  folderId: z.number().optional(),
  isFavorite: z.boolean(),
  shareId: z.string().optional(),
  createdAt: z.date(),
});

export const folderSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  createdAt: z.date(),
});

export const notificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.date(),
});

export const contactSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  message: z.string(),
  createdAt: z.date(),
});

// Types
export type User = z.infer<typeof userSchema>;
export type ChatHistory = z.infer<typeof chatHistorySchema>;
export type File = z.infer<typeof fileSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Contact = z.infer<typeof contactSchema>;

// Insert schemas for form validation
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  referralCode: z.string().optional(),
});

export const insertChatSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const insertFileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().optional(),
  folderId: z.number().optional(),
});

export const insertFolderSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const insertContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>; 