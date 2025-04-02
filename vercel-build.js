// vercel-build.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Ensure the dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  // Ensure the public directory exists for the client build
  if (!fs.existsSync('dist/public')) {
    fs.mkdirSync('dist/public');
  }

  // Step 1: Install client dependencies
  console.log('Installing client dependencies...');
  execSync('cd client && npm install', { stdio: 'inherit' });

  // Step 2: Build the client
  console.log('Building client...');
  execSync('cd client && npm run build', { stdio: 'inherit' });

  // Step 3: Copy client build to dist/public
  console.log('Copying client build to dist/public...');
  execSync('cp -r client/dist/* dist/public/', { stdio: 'inherit' });

  // Step 4: Build the server
  console.log('Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --external:vite --outfile=dist/index.js', 
    { stdio: 'inherit' });
    
  // Step 5: Copy package.json to dist
  console.log('Copying package.json to dist...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Simplify package.json for production
  const distPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    dependencies: packageJson.dependencies,
    optionalDependencies: packageJson.optionalDependencies
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(distPackageJson, null, 2));
  
  // Step 6: Install dependencies in the dist directory
  console.log('Installing dependencies in dist directory...');
  execSync('cd dist && npm install', { stdio: 'inherit' });
  
  // Step 7: Copy .env file to dist
  console.log('Copying .env file to dist...');
  if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', 'dist/.env');
  } else {
    console.warn('Warning: .env file not found. Environment variables will need to be set manually.');
  }

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 