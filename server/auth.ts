import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { supabase } from "./supabase";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log(`Password comparison - Stored password format: ${stored.includes('.') ? 'hash.salt' : 'other'}`);
    
    // Check if stored password has the expected format (hash.salt)
    if (stored.includes('.')) {
      // Modern format with proper hashing
      const [hashed, salt] = stored.split(".");
      console.log(`Using modern password comparison with salt: ${salt.substring(0, 6)}...`);
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`Modern password comparison result: ${result}`);
      return result;
    } else {
      // Fallback for plain text passwords or other formats
      // This is for backward compatibility only
      console.log("WARNING: Using fallback plain text password comparison. Please update password format.");
      
      // Simple comparison for plain text passwords
      const result = supplied === stored;
      console.log(`Fallback password comparison result: ${result}, supplied length: ${supplied.length}, stored length: ${stored.length}`);
      return result;
    }
  } catch (error) {
    console.error("Password comparison error:", error);
    // Return false on any error to be safe
    return false;
  }
}

async function upgradePasswordFormat(userId: number, password: string): Promise<void> {
  try {
    // Hash the password with the secure method
    const securePassword = await hashPassword(password);
    
    // Update the user's password in the database
    const { error } = await supabase
      .from("users")
      .update({ password: securePassword })
      .eq("id", userId);
    
    if (error) throw error;
    
    console.log(`Successfully upgraded password format for user ID: ${userId}`);
  } catch (error) {
    console.error("Failed to upgrade password format:", error);
    // We don't throw here to avoid disrupting the login process
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev_secret_key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }
        
        console.log(`User found: ${username}, ID: ${user.id}`);
        const passwordMatches = await comparePasswords(password, user.password);
        
        if (!passwordMatches) {
          console.log(`Password mismatch for user: ${username}`);
          return done(null, false);
        }
        
        console.log(`Password matches for user: ${username}`);
        
        // If password matched and isn't in the secure format, upgrade it
        if (!user.password.includes('.')) {
          console.log(`Upgrading password format for user: ${username}`);
          await upgradePasswordFormat(user.id, password);
        }
        
        console.log(`Authentication successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error(`Authentication error for username: ${username}`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Generate a unique referral code
      const referralCode = randomBytes(8).toString('hex');
      
      // Create user data with referral information
      const userData = {
        ...req.body,
        password: await hashPassword(req.body.password),
        referral_code: referralCode
      };
      
      // If there's a referral code in the query params, add it to the user data
      if (req.body.referrer) {
        userData.referredBy = req.body.referrer;
      }
      
      const user = await storage.createUser(userData);

      // Create a welcome notification
      await storage.createNotification(
        user.id, 
        "Welcome to Halal AI Chat! You've received 20 free credits to start."
      );

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      return res.status(500).json({ 
        message: "Registration failed. Please try again later.",
        status: "error"
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login request received:", { 
      username: req.body.username, 
      passwordLength: req.body.password ? req.body.password.length : 0 
    });
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed - no user returned");
        return res.status(401).json({ 
          message: "✨ Oops! Login failed. Either your username and password don't match or you need to create an account first! ✨", 
          status: "error" 
        });
      }
      
      console.log(`Authentication successful, logging in user ${user.username}, ID: ${user.id}`);
      req.login(user, (err) => {
        if (err) {
          console.error("Error during req.login:", err);
          return next(err);
        }
        console.log(`User ${user.username} successfully logged in`);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
