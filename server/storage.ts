
import { User, Contact, File, Folder, Chat, insertUserSchema, insertContactSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import session from "express-session";
import { supabase } from "./supabase";

export class SupabaseStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Initialize with a placeholder - we'll set the real store in the init method
    this.sessionStore = {} as session.SessionStore;
  }

  async init() {
    try {
      // You'll need to use a session store compatible with Supabase
      // For now, we'll keep the memory store for easy transition
      const memorystore = await import('memorystore');
      const MemoryStore = memorystore.default(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000,
      });
      return this;
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error("Failed to get user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as User;
    } catch (error) {
      console.error("Failed to get user by username:", error);
      return undefined;
    }
  }

  async createUser(userData: any): Promise<User> {
    try {
      const validatedUser = insertUserSchema.parse(userData);
      const { data, error } = await supabase
        .from("users")
        .insert(validatedUser)
        .select("*")
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }

  async addUserCredits(userId: number, amount: number): Promise<void> {
    try {
      const { error } = await supabase.rpc("add_credits", {
        user_id: userId,
        amount: amount,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error("Failed to add user credits:", error);
      throw error;
    }
  }

  async createContact(contactData: any): Promise<void> {
    try {
      const validatedContact = insertContactSchema.parse(contactData);
      const { error } = await supabase
        .from("contacts")
        .insert(validatedContact);
      
      if (error) throw error;
    } catch (error) {
      console.error("Failed to create contact:", error);
      throw error;
    }
  }

  async createFile(
    userId: number,
    name: string,
    content: string,
    folderId: number | null = null
  ): Promise<File> {
    try {
      const { data, error } = await supabase
        .from("files")
        .insert({
          user_id: userId,
          name: name,
          content: content,
          folder_id: folderId,
        })
        .select("*")
        .single();
      
      if (error) throw error;
      return data as File;
    } catch (error) {
      console.error("Failed to create file:", error);
      throw error;
    }
  }

  async createFolder(userId: number, name: string): Promise<Folder> {
    try {
      const { data, error } = await supabase
        .from("folders")
        .insert({
          user_id: userId,
          name: name,
        })
        .select("*")
        .single();
      
      if (error) throw error;
      return data as Folder;
    } catch (error) {
      console.error("Failed to create folder:", error);
      throw error;
    }
  }

  async searchFiles(userId: number, query: string): Promise<(File | Folder)[]> {
    try {
      // Using a more efficient approach with parallel queries
      const [fileResult, folderResult] = await Promise.all([
        supabase
          .from("files")
          .select("*, folder:folders(name)")
          .eq("user_id", userId)
          .ilike("name", `%${query}%`),
        supabase
          .from("folders")
          .select("*")
          .eq("user_id", userId)
          .ilike("name", `%${query}%`)
      ]);
      
      if (fileResult.error) throw fileResult.error;
      if (folderResult.error) throw folderResult.error;
      
      return [...(fileResult.data || []), ...(folderResult.data || [])];
    } catch (error) {
      console.error("Failed to search files:", error);
      throw error;
    }
  }

  async saveChatHistory(
    userId: number,
    prompt: string,
    response: string
  ): Promise<Chat> {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({
          user_id: userId,
          prompt: prompt,
          response: response,
        })
        .select("*")
        .single();
      
      if (error) throw error;
      return data as Chat;
    } catch (error) {
      console.error("Failed to save chat history:", error);
      throw error;
    }
  }
}

// Create but don't export directly - we need to initialize it first
const storageInstance = new SupabaseStorage();

// Export a promise that resolves to the initialized storage
export const storage = await storageInstance.init();
