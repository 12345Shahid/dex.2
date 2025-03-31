import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        console.error("Vite error:", msg);
        // Don't exit the process on error to keep the server running
        // process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Add Vite middlewares
  app.use(vite.middlewares);
  
  // Serve static files from the client directory
  const clientDir = path.resolve(__dirname, "..", "client");
  app.use(express.static(clientDir));
  
  // Explicitly serve important static files
  app.get('/src/main.tsx', (req, res) => {
    const filePath = path.resolve(clientDir, 'src', 'main.tsx');
    console.log(`Serving main.tsx from: ${filePath}`);
    res.sendFile(filePath);
  });
  
  app.get('/src/*', (req, res, next) => {
    const reqPath = req.path;
    const filePath = path.resolve(clientDir, reqPath.substring(1));
    console.log(`Serving static file: ${reqPath} from: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      console.log(`File not found: ${filePath}`);
      next();
    }
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    console.log(`Serving route: ${url}`);

    // Skip API routes
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if the file exists
      if (!fs.existsSync(clientTemplate)) {
        console.error(`Template file not found: ${clientTemplate}`);
        return next(new Error(`Could not find the client template at ${clientTemplate}`));
      }

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Ensure we're using the correct src path
      template = template.replace(
        /src="\/src\/main\.tsx(?:\?[^"]*)?"/,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      
      try {
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (transformError) {
        console.error("Error transforming HTML:", transformError);
        // Fallback to the original template if transformation fails
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      console.error(`Error serving ${url}:`, e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, we serve static files from the dist/public directory
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  
  console.log(`Looking for static files in: ${distPath}`);
  
  // If the production build doesn't exist, fall back to serving the client directory directly
  if (!fs.existsSync(distPath)) {
    console.warn(`Production build not found at ${distPath}, falling back to client directory`);
    const clientPath = path.resolve(__dirname, "..", "client");
    
    console.log(`Serving static files from: ${clientPath}`);
    app.use(express.static(clientPath));
    
    // Fallback to client/index.html for SPA routing
    app.use("*", (req, res) => {
      const indexPath = path.resolve(clientPath, "index.html");
      console.log(`Serving SPA from: ${indexPath} for URL: ${req.originalUrl}`);
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send("Client files not found. Please build the client first.");
      }
    });
    return;
  }
  
  // Serve production build static files
  console.log(`Serving production static files from: ${distPath}`);
  app.use(express.static(distPath));

  // Fall through to index.html if the file doesn't exist (for SPA routing)
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`Serving production SPA from: ${indexPath} for URL: ${req.originalUrl}`);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("Production build not found. Please build the client first.");
    }
  });
}
