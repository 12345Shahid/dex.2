import { IStorage } from "./types";
import { User, ChatHistory, File, Folder, Notification, Contact, InsertUser } from "@shared/schema";
import { nanoid } from "nanoid";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatHistory: Map<number, ChatHistory>;
  private files: Map<number, File>;
  private folders: Map<number, Folder>;
  private notifications: Map<number, Notification>;
  private contacts: Map<number, Contact>;
  private currentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.chatHistory = new Map();
    this.files = new Map();
    this.folders = new Map();
    this.notifications = new Map();
    this.contacts = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      id,
      ...insertUser,
      credits: 20,
      referralCode: nanoid(10),
      referredBy: null,
    };
    this.users.set(id, user);
    return user;
  }

  async addUserCredits(userId: number, amount: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      this.users.set(userId, { ...user, credits: user.credits + amount });
    }
  }

  async getUserChatHistory(userId: number): Promise<ChatHistory[]> {
    return Array.from(this.chatHistory.values()).filter(
      (chat) => chat.userId === userId,
    );
  }

  async saveChatHistory(userId: number, prompt: string, response: string): Promise<ChatHistory> {
    const id = this.currentId++;
    const chat: ChatHistory = {
      id,
      userId,
      prompt,
      response,
      isFavorite: false,
      createdAt: new Date(),
    };
    this.chatHistory.set(id, chat);
    return chat;
  }

  async toggleFavorite(chatId: number): Promise<void> {
    const chat = this.chatHistory.get(chatId);
    if (chat) {
      this.chatHistory.set(chatId, { ...chat, isFavorite: !chat.isFavorite });
    }
  }

  async getUserFiles(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId,
    );
  }

  async createFile(userId: number, name: string, content?: string, folderId?: number): Promise<File> {
    const id = this.currentId++;
    const file: File = {
      id,
      userId,
      name,
      content: content || '',
      folderId: folderId || null,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async createFolder(userId: number, name: string): Promise<Folder> {
    const id = this.currentId++;
    const folder: Folder = {
      id,
      userId,
      name,
      createdAt: new Date(),
    };
    this.folders.set(id, folder);
    return folder;
  }

  async searchFiles(userId: number, query: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) =>
        file.userId === userId &&
        (file.name.toLowerCase().includes(query.toLowerCase()) ||
          file.content.toLowerCase().includes(query.toLowerCase())),
    );
  }

  async createNotification(userId: number, message: string): Promise<void> {
    const id = this.currentId++;
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
  }

  async createContact(contact: Contact): Promise<void> {
    const id = this.currentId++;
    this.contacts.set(id, { ...contact, id, createdAt: new Date() });
  }
}

export const storage = new MemStorage();