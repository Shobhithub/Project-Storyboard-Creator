import mongoose from 'mongoose';
import { env, isProduction } from './config.js';
import app from './app.js';
import { startGenerationWorker, stopGenerationWorker } from './jobs.js';
import { User, Project, Page, Character, ChatMessage, ImageAsset, GenerationJob } from './models.js';

async function start(){
  if(!env.MONGODB_URI)throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB before starting the production API.');
  if(!env.JWT_SECRET||env.JWT_SECRET.length<32||/^(replace|generate|change|your[-_])/i.test(env.JWT_SECRET))throw new Error('JWT_SECRET must be a private, cryptographically random value of at least 32 characters. Generate one; do not use the .env.example placeholder.');
  if(env.IMAGE_STORAGE_PROVIDER==='cloudinary'&&(!env.CLOUDINARY_CLOUD_NAME||!env.CLOUDINARY_API_KEY||!env.CLOUDINARY_API_SECRET))throw new Error('Cloudinary storage was selected, but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are all required.');
  if(env.IMAGE_PROVIDER==='comfyui'&&!env.COMFYUI_WORKFLOW_FILE)throw new Error('ComfyUI was selected, but COMFYUI_WORKFLOW_FILE is missing.');
  await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:10_000});
  if(!isProduction)console.log('[db] connected to MongoDB');
  await Promise.all([User.init(),Project.init(),Page.init(),Character.init(),ChatMessage.init(),ImageAsset.init(),GenerationJob.init()]);
  await startGenerationWorker();
  const server=app.listen(env.SERVER_PORT,'0.0.0.0',()=>console.log(`Vizzy API ready on :${env.SERVER_PORT} · MongoDB connected · image provider: ${env.IMAGE_PROVIDER}`));
  const shutdown=async(signal:string)=>{console.log(`[server] ${signal}; graceful shutdown`);stopGenerationWorker();server.close(async()=>{await mongoose.disconnect();process.exit(0);});setTimeout(()=>process.exit(1),10_000).unref();};
  process.once('SIGINT',()=>void shutdown('SIGINT'));process.once('SIGTERM',()=>void shutdown('SIGTERM'));
}
start().catch(err=>{console.error('[startup]',err instanceof Error?err.message:err);process.exitCode=1;});
