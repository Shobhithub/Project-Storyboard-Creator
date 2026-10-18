import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { v2 as cloudinary } from 'cloudinary';
import { env } from './config.js';
import { HttpError } from './errors.js';

export const uploadDir=path.resolve('server/uploads');
export const localImagePath=(key:string)=>path.join(uploadDir,path.basename(key));
if(env.IMAGE_STORAGE_PROVIDER==='cloudinary')cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
export interface StoredFile {url:string;key:string;mimeType:string;byteSize:number;provider:'local'|'cloudinary'}
export async function saveImage(buffer:Buffer,mimeType:string):Promise<StoredFile>{
  if(!['image/png','image/jpeg','image/webp'].includes(mimeType))throw new HttpError(415,'Only PNG, JPEG, and WebP images are supported.','UNSUPPORTED_IMAGE_TYPE');
  const detected=await fileTypeFromBuffer(buffer);
  if(!detected||detected.mime!==mimeType)throw new HttpError(415,'The uploaded file content does not match a supported image format.','INVALID_IMAGE_CONTENT');
  const extension=mimeType==='image/jpeg'?'jpg':mimeType.split('/')[1];const key=`${crypto.randomUUID()}.${extension}`;
  if(env.IMAGE_STORAGE_PROVIDER==='cloudinary'){
    const result=await new Promise<any>((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({resource_type:'image',folder:'vizzy-studio',public_id:key.replace(/\.[^.]+$/,''),overwrite:false,type:'authenticated',access_mode:'authenticated'},(err,result)=>err?reject(err):resolve(result));stream.end(buffer);});
    return{url:result.secure_url,key:result.public_id,mimeType,byteSize:buffer.length,provider:'cloudinary'};
  }
  await fs.mkdir(uploadDir,{recursive:true});await fs.writeFile(path.join(uploadDir,key),buffer,{flag:'wx'});
  return{url:`/uploads/${key}`,key,mimeType,byteSize:buffer.length,provider:'local'};
}
export function signedCloudinaryUrl(key:string,mimeType:string,ttlSeconds=60){
  const format=mimeType==='image/jpeg'?'jpg':mimeType.split('/')[1];
  return cloudinary.utils.private_download_url(key,format,{resource_type:'image',expires_at:Math.floor(Date.now()/1000)+ttlSeconds});
}
export async function readImage(key:string,provider:string,mimeType:string){
  if(provider==='cloudinary'){
    const response=await fetch(signedCloudinaryUrl(key,mimeType),{signal:AbortSignal.timeout(30_000)});
    if(!response.ok)throw new HttpError(502,'The stored reference image could not be retrieved.','STORAGE_READ_FAILED');
    return Buffer.from(await response.arrayBuffer());
  }
  return fs.readFile(localImagePath(key));
}
export async function deleteImage(key:string,provider:string){
  if(provider==='cloudinary'){await cloudinary.uploader.destroy(key,{resource_type:'image',type:'authenticated'});return;}
  await fs.rm(localImagePath(key),{force:true});
}
