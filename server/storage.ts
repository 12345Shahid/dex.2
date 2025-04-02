import { User, Contact, File, Folder, Chat, insertUserSchema, insertContactSchema } from "./schema";
import { createClient } from "@supabase/supabase-js";
import session from "express-session";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from 'uuid'; // Import uuid library
import { nanoid } from 'nanoid'; // Import nanoid library

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

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("referral_code", referralCode)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as User;
    } catch (error) {
      console.error("Failed to get user by referral code:", error);
      return undefined;
    }
  }

  async createUser(userData: any): Promise<User> {
    try {
      const validatedUser = insertUserSchema.parse(userData);
      // Generate a referral code
      const referralCode = uuidv4();
      
      // Check if there's a referrer
      let referredBy = null;
      if (userData.referredBy) {
        const referrer = await this.getUserByReferralCode(userData.referredBy);
        if (referrer) {
          referredBy = referrer.id;
          
          // Give the referrer a credit when someone signs up with their code
          await this.addUserCredits(referrer.id, 1);
        }
      }
      
      const { data, error } = await supabase
        .from("users")
        .insert({ 
          ...validatedUser, 
          referral_code: referralCode,
          referred_by: referredBy
        })
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
      // Log the credit adjustment attempt
      console.log(`Attempting to ${amount >= 0 ? 'add' : 'deduct'} ${Math.abs(amount)} credit(s) for user ${userId}`);
      
      // Get the current user credits before the update
      const { data: userBefore, error: userBeforeError } = await supabase
        .from("users")
        .select("credits")
        .eq("id", userId)
        .single();
      
      if (userBeforeError) {
        console.error("Failed to get user before credits update:", userBeforeError);
        throw userBeforeError;
      }
      
      console.log(`Current user credits before update: ${userBefore.credits}`);
      
      // First try using the RPC function
      const { error } = await supabase.rpc("add_credits", {
        user_id: userId,
        amount: amount,
      });

      // If there's an error with the RPC function, fallback to direct update
      if (error) {
        console.warn("RPC add_credits failed, falling back to direct update:", error.message);
        
        // Update the credits directly
        const { error: updateError } = await supabase
          .from("users")
          .update({ credits: userBefore.credits + amount })
          .eq("id", userId);
          
        if (updateError) {
          console.error("Direct update of credits failed:", updateError);
          throw updateError;
        }
      }
      
      // Verify the credits were updated
      const { data: userAfter, error: userAfterError } = await supabase
        .from("users")
        .select("credits")
        .eq("id", userId)
        .single();
        
      if (userAfterError) {
        console.error("Failed to get user after credits update:", userAfterError);
        throw userAfterError;
      }
      
      console.log(`Credits update ${amount >= 0 ? 'added' : 'deducted'} successfully. Before: ${userBefore.credits}, After: ${userAfter.credits}`);
      
      // If the user earned credits, share with their referrer as well
      if (amount > 0) {
        await this.shareCreditsWithReferrer(userId, amount);
      }
    } catch (error) {
      console.error("Failed to add user credits:", error);
      // Don't throw error to prevent breaking the app flow
      // Just log it and continue
    }
  }
  
  async shareCreditsWithReferrer(userId: number, amount: number): Promise<void> {
    try {
      // Get the user to find their referrer
      const { data: user, error } = await supabase
        .from("users")
        .select("referred_by, username")
        .eq("id", userId)
        .single();
        
      if (error) {
        console.error("Failed to get user for credit sharing:", error);
        throw error;
      }
      
      // If user has a referrer, share the credits
      if (user && user.referred_by) {
        console.log(`Sharing ${amount} credits with referrer ${user.referred_by} for user ${user.username} (${userId})`);
        
        // Get the referrer's current credits
        const { data: referrerBefore, error: referrerBeforeError } = await supabase
          .from("users")
          .select("credits, username")
          .eq("id", user.referred_by)
          .single();
          
        if (referrerBeforeError) {
          console.error("Failed to get referrer before credit sharing:", referrerBeforeError);
          throw referrerBeforeError;
        }
        
        console.log(`Referrer ${referrerBefore.username} (${user.referred_by}) has ${referrerBefore.credits} credits before sharing`);
        
        // Try using the RPC function first
        const { error: rpcError } = await supabase.rpc("add_credits", {
          user_id: user.referred_by,
          amount: amount,
        });
        
        // If RPC fails, fall back to direct update
        if (rpcError) {
          console.warn("RPC add_credits failed for referrer, falling back to direct update:", rpcError.message);
          
          // Update the credits directly
          const { error: updateError } = await supabase
            .from("users")
            .update({ credits: referrerBefore.credits + amount })
            .eq("id", user.referred_by);
            
          if (updateError) {
            console.error("Direct update of referrer credits failed:", updateError);
            throw updateError;
          }
        }
        
        // Verify the referrer credits were updated
        const { data: referrerAfter, error: referrerAfterError } = await supabase
          .from("users")
          .select("credits")
          .eq("id", user.referred_by)
          .single();
          
        if (referrerAfterError) {
          console.error("Failed to get referrer after credit sharing:", referrerAfterError);
          throw referrerAfterError;
        }
        
        console.log(`Credits shared successfully. Referrer before: ${referrerBefore.credits}, after: ${referrerAfter.credits}`);
        
        // Send a notification to the referrer
        try {
          await this.createNotification(
            user.referred_by,
            `You received ${amount} credit(s) because ${user.username} earned credits!`
          );
          console.log("Credit sharing notification sent to referrer");
        } catch (notificationError) {
          console.error("Failed to send credit sharing notification:", notificationError);
          // Don't throw, as notification is non-critical
        }
      } else {
        console.log(`User ${userId} has no referrer, skipping credit sharing`);
      }
    } catch (error) {
      console.error("Failed to share credits with referrer:", error);
      // Don't throw here, as this is a secondary operation
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
      console.log(`Searching for files and folders for user ${userId} with query: "${query}"`);
      
      let filePromise, folderPromise;
      
      if (query) {
        // If we have a search query, use ilike for partial matching
        filePromise = supabase
          .from("files")
          .select("*, folder:folders(name)")
          .eq("user_id", userId)
          .ilike("name", `%${query}%`);
          
        folderPromise = supabase
          .from("folders")
          .select("*")
          .eq("user_id", userId)
          .ilike("name", `%${query}%`);
      } else {
        // If no query, get all files and folders
        filePromise = supabase
          .from("files")
          .select("*, folder:folders(name)")
          .eq("user_id", userId);
          
        folderPromise = supabase
          .from("folders")
          .select("*")
          .eq("user_id", userId);
      }

      // Run both queries in parallel
      const [fileResult, folderResult] = await Promise.all([filePromise, folderPromise]);

      if (fileResult.error) throw fileResult.error;
      if (folderResult.error) throw folderResult.error;

      // Combine and return results
      const results = [...fileResult.data, ...folderResult.data];
      console.log(`Found ${fileResult.data.length} files and ${folderResult.data.length} folders`);
      
      return results;
    } catch (error) {
      console.error("Failed to search files:", error);
      throw error;
    }
  }

  async saveChatHistory(userId: number, prompt: string, response: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("chat_history")
        .insert({
          user_id: userId,
          prompt: prompt,
          response: response,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to save chat history:", error);
      // Don't throw, as we want this to be non-blocking
    }
  }

  async getUserChatHistory(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get user chat history:", error);
      return [];
    }
  }

  async toggleFavoriteChat(chatId: number, isFavorite: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("chat_history")
        .update({ is_favorite: isFavorite })
        .eq("id", chatId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to toggle favorite chat:", error);
      throw error;
    }
  }

  async getFavoriteChatHistory(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", userId)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get favorite chat history:", error);
      return [];
    }
  }

  async createNotification(userId: number, message: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          message: message,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to create notification:", error);
      // Don't throw, as notifications are not critical
    }
  }

  async getUserNotifications(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to get user notifications:", error);
      return [];
    }
  }
  
  async markNotificationsAsRead(userId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }

  async getFile(fileId: number, userId: number): Promise<File | null> {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("id", fileId)
        .eq("user_id", userId) // Security: ensure the file belongs to the user
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, file not found
          return null;
        }
        throw error;
      }
      
      return data as File;
    } catch (error) {
      console.error("Failed to get file:", error);
      throw error;
    }
  }

  async generateShareId(fileId: number): Promise<string> {
    // Generate a unique share ID using nanoid with a custom alphabet
    const shareId = nanoid(32, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    
    // Update the file with the new share ID
    const { error } = await supabase
      .from('files')
      .update({ share_id: shareId })
      .eq('id', fileId);
      
    if (error) {
      console.error('Failed to update file with share ID:', error);
      throw new Error('Failed to generate share ID');
    }
    
    return shareId;
  }

  async getFileByShareId(shareId: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('share_id', shareId)
      .single();
      
    if (error) {
      console.error('Failed to get file by share ID:', error);
      throw new Error('Failed to retrieve shared file');
    }
    
    return data;
  }

  async getFolder(folderId: number, userId: number): Promise<Folder | null> {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .eq("user_id", userId) // Security: ensure the folder belongs to the user
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned, folder not found
          return null;
        }
        throw error;
      }
      
      return data as Folder;
    } catch (error) {
      console.error("Failed to get folder:", error);
      throw error;
    }
  }
  
  async getFolderContents(folderId: number, userId: number): Promise<any[]> {
    try {
      // Get files in the folder
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folderId)
        .eq("user_id", userId); // Security: ensure the files belong to the user

      if (filesError) throw filesError;
      
      // Get sub-folders in the folder
      const { data: subFolders, error: foldersError } = await supabase
        .from("folders")
        .select("*")
        .eq("parent_id", folderId)
        .eq("user_id", userId); // Security: ensure the folders belong to the user
        
      if (foldersError) throw foldersError;
      
      console.log(`Found ${files.length} files and ${subFolders.length} sub-folders in folder ${folderId}`);
      
      // Return combined results
      return [...files, ...subFolders];
    } catch (error) {
      console.error("Failed to get folder contents:", error);
      throw error;
    }
  }

  async updateFile(
    fileId: number, 
    userId: number, 
    updates: { 
      name?: string, 
      content?: string, 
      folderId?: number | null 
    }
  ): Promise<File> {
    try {
      // First check if the file exists and belongs to the user
      const file = await this.getFile(fileId, userId);
      if (!file) {
        throw new Error("File not found or does not belong to the user");
      }
      
      const { data, error } = await supabase
        .from("files")
        .update({
          name: updates.name !== undefined ? updates.name : file.name,
          content: updates.content !== undefined ? updates.content : file.content,
          folder_id: updates.folderId !== undefined ? updates.folderId : file.folderId,
        })
        .eq("id", fileId)
        .eq("user_id", userId) // Extra security
        .select("*")
        .single();

      if (error) throw error;
      
      return data as File;
    } catch (error) {
      console.error("Failed to update file:", error);
      throw error;
    }
  }

  async deleteFile(fileId: number, userId: number): Promise<void> {
    try {
      // First check if the file exists and belongs to the user
      const file = await this.getFile(fileId, userId);
      if (!file) {
        throw new Error("File not found or does not belong to the user");
      }
      
      const { error } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId)
        .eq("user_id", userId); // Extra security

      if (error) throw error;
    } catch (error) {
      console.error("Failed to delete file:", error);
      throw error;
    }
  }

  async deleteFolder(folderId: number, userId: number): Promise<void> {
    try {
      // First check if the folder exists and belongs to the user
      const folder = await this.getFolder(folderId, userId);
      if (!folder) {
        throw new Error("Folder not found or does not belong to the user");
      }
      
      // Check if folder has files
      const files = await this.getFolderContents(folderId, userId);
      if (files.length > 0) {
        throw new Error("Cannot delete folder with files. Remove files first.");
      }
      
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId)
        .eq("user_id", userId); // Extra security

      if (error) throw error;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      throw error;
    }
  }

  async moveFile(fileId: number, userId: number, folderId: number | null): Promise<File> {
    return this.updateFile(fileId, userId, { folderId });
  }

  async getUserFolders(userId: number): Promise<Folder[]> {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) throw error;
      
      return data as Folder[];
    } catch (error) {
      console.error("Failed to get user folders:", error);
      throw error;
    }
  }

  async getUserRootFiles(userId: number): Promise<File[]> {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", userId)
        .is("folder_id", null)
        .order("name", { ascending: true });

      if (error) throw error;
      
      return data as File[];
    } catch (error) {
      console.error("Failed to get user root files:", error);
      throw error;
    }
  }

  async toggleFavoriteFile(fileId: number, isFavorite: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("files")
        .update({ is_favorite: isFavorite })
        .eq("id", fileId);

      if (error) throw error;
    } catch (error) {
      console.error("Failed to toggle file favorite status:", error);
      throw error;
    }
  }

  async getFavoriteFiles(userId: number): Promise<File[]> {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", userId)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as File[];
    } catch (error) {
      console.error("Failed to get favorite files:", error);
      throw error;
    }
  }
}

// Create but don't export directly - we need to initialize it first
const storageInstance = new SupabaseStorage();

// Initialize storage with proper error handling
let storage: SupabaseStorage;

try {
  storage = await storageInstance.init();
} catch (error) {
  console.error("Failed to initialize storage:", error);
  // Create a minimal implementation to prevent crashes
  storage = storageInstance;
}

export { storage };