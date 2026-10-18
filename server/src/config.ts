import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  MONGODB_URI: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-2.5-sunburst'),
  IMAGE_PROVIDER: z.enum(['openai','comfyui']).default('openai'),
  IMAGE_STORAGE_PROVIDER: z.enum(['local','cloudinary']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  COMFYUI_BASE_URL: z.string().url().default('http://127.0.0.1:8188'),
  COMFYUI_WORKFLOW_FILE: z.string().optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MAX_GENERATION_ALTERNATIVES: z.coerce.number().int().min(1).max(4).default(3),
  GENERATION_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
});

const parsed=schema.safeParse(process.env);
if(!parsed.success){
  const errors=parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid Vizzy configuration:\n${errors}`);
}
export const env=parsed.data;
export const isProduction=env.NODE_ENV==='production';
export const aiConfigured=Boolean(env.OPENAI_API_KEY);
