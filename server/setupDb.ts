
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create users table
    const { error: usersError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          credits INTEGER NOT NULL DEFAULT 20,
          referral_code TEXT UNIQUE NOT NULL,
          referred_by INTEGER REFERENCES users(id)
        );
      `
    });
    
    if (usersError) throw usersError;
    console.log('Created users table');
    
    // Create chat_history table
    const { error: chatError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS chat_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          is_favorite BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (chatError) throw chatError;
    console.log('Created chat_history table');
    
    // Create folders table
    const { error: foldersError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS folders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (foldersError) throw foldersError;
    console.log('Created folders table');
    
    // Create files table
    const { error: filesError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS files (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          name TEXT NOT NULL,
          content TEXT,
          folder_id INTEGER REFERENCES folders(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (filesError) throw filesError;
    console.log('Created files table');
    
    // Create notifications table
    const { error: notificationsError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (notificationsError) throw notificationsError;
    console.log('Created notifications table');
    
    // Create contacts table
    const { error: contactsError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (contactsError) throw contactsError;
    console.log('Created contacts table');
    
    // Create add_credits function
    const { error: functionError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION add_credits(user_id integer, amount integer)
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          UPDATE users
          SET credits = credits + amount
          WHERE id = user_id;
        END;
        $$;
      `
    });
    
    if (functionError) throw functionError;
    console.log('Created add_credits function');
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase();
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function setupDatabase() {
  console.log("Setting up database tables...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });
  
  try {
    // Create tables using raw SQL to ensure they exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 20,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by INTEGER REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        name TEXT NOT NULL,
        content TEXT,
        folder_id INTEGER REFERENCES folders(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
  } finally {
    process.exit(0);
  }
}

setupDatabase();
