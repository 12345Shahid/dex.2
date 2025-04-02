import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import cors from "cors";
import { supabase } from "./supabase";
import passport from 'passport';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Checks the database schema for required columns and tables
 * Logs warnings if any required schema elements are missing
 */
async function checkDatabaseSchema() {
  try {
    console.log('Checking database schema...');
    const missingElements = [];
    
    // 1. Check for parent_id column in folders table
    try {
      const { error: folderError } = await supabase
        .from('folders')
        .select('parent_id')
        .limit(1);
        
      if (folderError && folderError.code === '42703') {
        console.warn('❌ Missing column: folders.parent_id');
        missingElements.push({
          type: 'column',
          table: 'folders',
          column: 'parent_id',
          sql: `ALTER TABLE folders ADD COLUMN parent_id INTEGER REFERENCES folders(id);`
        });
      } else {
        console.log('✅ Found column: folders.parent_id');
      }
    } catch (err) {
      console.error('Error checking folders.parent_id:', err);
    }
    
    // 2. Check for is_favorite column in files table
    try {
      const { error: fileError } = await supabase
        .from('files')
        .select('is_favorite')
        .limit(1);
        
      if (fileError && fileError.code === '42703') {
        console.warn('❌ Missing column: files.is_favorite');
        missingElements.push({
          type: 'column',
          table: 'files',
          column: 'is_favorite',
          sql: `ALTER TABLE files ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;`
        });
      } else {
        console.log('✅ Found column: files.is_favorite');
      }
    } catch (err) {
      console.error('Error checking files.is_favorite:', err);
    }
    
    // Summarize missing elements
    if (missingElements.length > 0) {
      console.warn('\n========== DATABASE SCHEMA ISSUES ==========');
      console.warn(`Found ${missingElements.length} missing elements in the database schema.`);
      console.warn('Please run the following SQL commands in your database:');
      console.warn('\n```sql');
      missingElements.forEach(element => {
        console.warn(element.sql);
      });
      console.warn('```\n');
      console.warn('Or use the provided fix-database-schema.sql file.');
      console.warn('===============================================\n');
      
      // Store the schema status in the application
      global.schemaIssues = missingElements;
    } else {
      console.log('✅ Database schema is up to date!');
      global.schemaIssues = [];
    }
  } catch (err) {
    console.error('Error checking database schema:', err);
  }
}

async function main() {
  try {
    // Register routes and get the HTTP server
    const server = await registerRoutes(app);

    // Check database schema before starting server
    await checkDatabaseSchema();

    // Add global error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler caught:', err);
      
      // Database connection errors
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          message: "We're experiencing database connectivity issues. Please try again in a few minutes.",
          errorCode: "DB_CONNECTION"
        });
      }
      
      // Database schema errors
      if (err.code === '42703') {
        return res.status(503).json({ 
          message: "System update in progress. Please try again in a few minutes.",
          errorCode: "SCHEMA_ERROR"
        });
      }
      
      // Authentication errors
      if (err.name === 'AuthenticationError') {
        return res.status(401).json({ 
          message: "Your session has expired. Please log in again.",
          errorCode: "AUTH_ERROR"
        });
      }
      
      // Rate limiting
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({ 
          message: "You've made too many requests. Please try again in a few minutes.",
          errorCode: "RATE_LIMIT"
        });
      }
      
      // Default error response - don't expose error details in production
      res.status(500).json({ 
        message: "We're experiencing technical difficulties. Our team has been notified and is working on a fix.",
        errorCode: "SERVER_ERROR"
      });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting in development mode with Vite middleware');
      await setupVite(app, server);
    } else {
      console.log('Starting in production mode with static file serving');
      serveStatic(app);
    }

    // Serve the app on port 8080
    const port = 8080;
    server.listen(port, 'localhost', () => {
      log(`serving on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
