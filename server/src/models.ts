import mongoose, { Schema, Types } from 'mongoose';

const { ObjectId } = Schema.Types;

export interface IUser {
  name: string; email: string; passwordHash: string;
  createdAt: Date; updatedAt: Date;
}
const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true });

export interface IStyleGuide {
  artStyle: string; palette: string; lighting: string; rendering: string;
  aspectRatio: 'landscape' | 'portrait' | 'square'; composition: string; negativeInstructions: string;
}
const styleGuideSchema = new Schema<IStyleGuide>({
  artStyle: { type: String, default: 'Cinematic graphic novel', maxlength: 500 },
  palette: { type: String, default: 'Blue-grey, muted sand, sepia highlights', maxlength: 300 },
  lighting: { type: String, default: 'Atmospheric cinematic light', maxlength: 300 },
  rendering: { type: String, default: 'Painterly ink and subtle paper texture', maxlength: 300 },
  aspectRatio: { type: String, enum: ['landscape', 'portrait', 'square'], default: 'landscape' },
  composition: { type: String, default: '', maxlength: 500 },
  negativeInstructions: { type: String, default: 'No lettering, captions, watermarks, or borders.', maxlength: 500 },
}, { _id: false });

export interface IProject {
  ownerId: Types.ObjectId; title: string; genre: string; storyNotes: string; storyOutline: unknown[];
  styleGuide: IStyleGuide; aspectRatio: string; pageOrder: Types.ObjectId[];
  settings: { intendedAudience: string; desiredPageCount: number; creativeInstructions: string };
  createdAt: Date; updatedAt: Date;
}
const projectSchema = new Schema<IProject>({
  ownerId: { type: ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  genre: { type: String, default: '', maxlength: 80 },
  storyNotes: { type: String, default: '', maxlength: 30000 },
  storyOutline: { type: [Schema.Types.Mixed], default: [] },
  styleGuide: { type: styleGuideSchema, default: () => ({}) },
  aspectRatio: { type: String, enum: ['landscape', 'portrait', 'square'], default: 'landscape' },
  pageOrder: [{ type: ObjectId, ref: 'Page' }],
  settings: {
    intendedAudience: { type: String, default: 'General audience', maxlength: 100 },
    desiredPageCount: { type: Number, min: 1, max: 80, default: 8 },
    creativeInstructions: { type: String, default: '', maxlength: 3000 },
  },
}, { timestamps: true });
projectSchema.index({ ownerId: 1, updatedAt: -1 });

export type PageStatus = 'draft' | 'generating' | 'review' | 'approved' | 'failed';
export interface IPage {
  projectId: Types.ObjectId; title: string; order: number; sceneDescription: string; visualPrompt: string;
  dialogue: string; narration: string; characterIds: Types.ObjectId[]; selectedAssetId?: Types.ObjectId;
  status: PageStatus; durationSeconds: number; createdAt: Date; updatedAt: Date;
}
const pageSchema = new Schema<IPage>({
  projectId: { type: ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, default: '', trim: true, maxlength: 160 },
  order: { type: Number, required: true, min: 0 },
  sceneDescription: { type: String, default: '', maxlength: 5000 },
  visualPrompt: { type: String, default: '', maxlength: 8000 },
  dialogue: { type: String, default: '', maxlength: 4000 },
  narration: { type: String, default: '', maxlength: 4000 },
  characterIds: [{ type: ObjectId, ref: 'Character' }],
  selectedAssetId: { type: ObjectId, ref: 'ImageAsset' },
  status: { type: String, enum: ['draft', 'generating', 'review', 'approved', 'failed'], default: 'draft', index: true },
  durationSeconds: { type: Number, min: 1, max: 120, default: 5 },
}, { timestamps: true });
pageSchema.index({ projectId: 1, order: 1 }, { unique: true });

export interface ICharacter {
  _id?: Types.ObjectId; projectId: Types.ObjectId; name: string; description: string; appearance: string; clothing: string;
  background: string; referenceAssetIds: Types.ObjectId[]; createdAt: Date; updatedAt: Date;
}
const characterSchema = new Schema<ICharacter>({
  projectId: { type: ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 1500 },
  appearance: { type: String, default: '', maxlength: 1500 },
  clothing: { type: String, default: '', maxlength: 1000 },
  background: { type: String, default: '', maxlength: 1500 },
  referenceAssetIds: [{ type: ObjectId, ref: 'ImageAsset' }],
}, { timestamps: true });
characterSchema.index({ projectId: 1, name: 1 }, { unique: true });

export interface IChatMessage {
  projectId: Types.ObjectId; pageId?: Types.ObjectId; role: 'user' | 'assistant' | 'system'; content: string;
  associatedAssetIds: Types.ObjectId[]; createdAt: Date; updatedAt: Date;
}
const chatMessageSchema = new Schema<IChatMessage>({
  projectId: { type: ObjectId, ref: 'Project', required: true, index: true },
  pageId: { type: ObjectId, ref: 'Page' },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true, maxlength: 10000 },
  associatedAssetIds: [{ type: ObjectId, ref: 'ImageAsset' }],
}, { timestamps: true });
chatMessageSchema.index({ projectId: 1, createdAt: 1 });

export interface IImageAsset {
  projectId: Types.ObjectId; pageId?: Types.ObjectId; storageUrl: string; storageKey: string;
  provider: string; storageProvider: 'local'|'cloudinary'; model: string; prompt: string; parentAssetId?: Types.ObjectId; generationJobId?: Types.ObjectId; alternativeIndex?: number;
  generationParameters: Record<string, unknown>; version: number; status: 'ready' | 'failed';
  mimeType: string; byteSize: number; createdAt: Date; updatedAt: Date;
}
const imageAssetSchema = new Schema<IImageAsset>({
  projectId: { type: ObjectId, ref: 'Project', required: true, index: true },
  pageId: { type: ObjectId, ref: 'Page', index: true },
  storageUrl: { type: String, required: true }, storageKey: { type: String, required: true },
  provider: { type: String, required: true }, storageProvider: { type: String, enum: ['local','cloudinary'], default: 'local', required: true }, model: { type: String, required: true },
  prompt: { type: String, required: true, maxlength: 8000 }, parentAssetId: { type: ObjectId, ref: 'ImageAsset' }, generationJobId: { type: ObjectId, ref: 'GenerationJob' }, alternativeIndex: { type: Number, min: 0 },
  generationParameters: { type: Schema.Types.Mixed, default: {} }, version: { type: Number, min: 1, default: 1 },
  status: { type: String, enum: ['ready', 'failed'], default: 'ready' },
  mimeType: { type: String, required: true }, byteSize: { type: Number, min: 0, required: true },
}, { timestamps: true });
imageAssetSchema.index({ projectId: 1, pageId: 1, version: -1 });
imageAssetSchema.index({ generationJobId: 1, alternativeIndex: 1 }, { unique: true, sparse: true });

export interface IGenerationJob {
  ownerId: Types.ObjectId; projectId: Types.ObjectId; pageId: Types.ObjectId; status: 'queued'|'processing'|'completed'|'failed';
  operation: 'generate'|'refine'; provider: string; prompt: string; parentAssetId?: Types.ObjectId;
  alternativeCount: number; idempotencyKey: string; assetIds: Types.ObjectId[]; errorCode?: string;
  errorMessage?: string; usageMetadata: Record<string, unknown>; attempts: number; startedAt?: Date; finishedAt?: Date;
  createdAt: Date; updatedAt: Date;
}
const generationJobSchema = new Schema<IGenerationJob>({
  ownerId: { type: ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: ObjectId, ref: 'Project', required: true, index: true },
  pageId: { type: ObjectId, ref: 'Page', required: true, index: true },
  status: { type: String, enum: ['queued','processing','completed','failed'], default: 'queued', index: true },
  operation: { type: String, enum: ['generate','refine'], required: true },
  provider: { type: String, required: true }, prompt: { type: String, required: true, maxlength: 8000 },
  parentAssetId: { type: ObjectId, ref: 'ImageAsset' },
  alternativeCount: { type: Number, min: 1, max: 4, default: 2 }, idempotencyKey: { type: String, required: true },
  assetIds: [{ type: ObjectId, ref: 'ImageAsset' }], errorCode: String, errorMessage: { type: String, maxlength: 500 },
  usageMetadata: { type: Schema.Types.Mixed, default: {} }, attempts: { type: Number, default: 0 }, startedAt: Date, finishedAt: Date,
}, { timestamps: true });
generationJobSchema.index({ ownerId: 1, idempotencyKey: 1 }, { unique: true });
generationJobSchema.index({ status: 1, createdAt: 1 });

export const User: any = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const Project: any = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
export const Page: any = mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);
export const Character: any = mongoose.models.Character || mongoose.model<ICharacter>('Character', characterSchema);
export const ChatMessage: any = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export const ImageAsset: any = mongoose.models.ImageAsset || mongoose.model<IImageAsset>('ImageAsset', imageAssetSchema);
export const GenerationJob: any = mongoose.models.GenerationJob || mongoose.model<IGenerationJob>('GenerationJob', generationJobSchema);
