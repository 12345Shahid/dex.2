
import { IStorage } from "./types";
import { User, ChatHistory, File, Folder, Notification, Contact, InsertUser } from "@shared/schema";
import { nanoid } from "nanoid";
import session from "express-session";
import { supabase } from "./supabase";

export class SupabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // You'll need to use a session store compatible with Supabase
    // For now, we'll keep the memory store for easy transition
    import memorystore from 'memorystore';
    const MemoryStore = memorystore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // In production, you might want to use something like:
    // const PgStore = require('connect-pg-simple')(session);
    // this.sessionStore = new PgStore({
    //   conString: process.env.DATABASE_URL
    // });
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const referralCode = nanoid(10);
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...insertUser,
        credits: 20,
        referral_code: referralCode,
        referred_by: null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  }

  async addUserCredits(userId: number, amount: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    await supabase
      .from('users')
      .update({ credits: user.credits + amount })
      .eq('id', userId);
  }

  async getUserChatHistory(userId: number): Promise<ChatHistory[]> {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data as ChatHistory[];
  }

  async saveChatHistory(userId: number, prompt: string, response: string): Promise<ChatHistory> {
    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt,
        response,
        is_favorite: false,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as ChatHistory;
  }

  async toggleFavorite(chatId: number): Promise<void> {
    const { data } = await supabase
      .from('chat_history')
      .select('is_favorite')
      .eq('id', chatId)
      .single();
    
    if (!data) return;
    
    await supabase
      .from('chat_history')
      .update({ is_favorite: !data.is_favorite })
      .eq('id', chatId);
  }

  async getUserFiles(userId: number): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data as File[];
  }

  async createFile(userId: number, name: string, content?: string, folderId?: number): Promise<File> {
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        name,
        content: content || '',
        folder_id: folderId || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as File;
  }

  async createFolder(userId: number, name: string): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: userId,
        name,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Folder;
  }

  async searchFiles(userId: number, query: string): Promise<(File | Folder)[]> {
    console.log(`Searching for "${query}" for user ${userId}`);
    const lowercaseQuery = query.toLowerCase();

    // If no query, return all items
    if (!query) {
      const [filesResult, foldersResult] = await Promise.all([
        supabase.from('files').select('*').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId)
      ]);
      
      const files = filesResult.data || [];
      const folders = foldersResult.data || [];
      
      return [...files, ...folders];
    }

    // Search with ILIKE for partial matches
    const [filesResult, foldersResult] = await Promise.all([
      supabase.from('files')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${lowercaseQuery}%,content.ilike.%${lowercaseQuery}%`),
      supabase.from('folders')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${lowercaseQuery}%`)
    ]);
    
    const files = filesResult.data || [];
    const folders = foldersResult.data || [];
    
    return [...files, ...folders];
  }

  async createNotification(userId: number, message: string): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: userId,
      message,
      read: false,
    });
  }

  async createContact(contact: Contact): Promise<void> {
    await supabase.from('contacts').insert({
      ...contact
    });
  }
}

export const storage = new SupabaseStorage();
