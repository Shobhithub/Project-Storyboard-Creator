import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status:number,message:string,public code='REQUEST_FAILED'){super(message);this.name='HttpError';}
}
export function asyncRoute(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>){return(req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res,next)).catch(next);}
export function errorHandler(err:unknown,_req:Request,res:Response,_next:NextFunction){
  const e=err as {status?:number;code?:string|number;message?:string;name?:string;keyValue?:Record<string,unknown>;errors?:Record<string,unknown>};
  let status=e.status??500,code=e.code||'INTERNAL_ERROR',message=e.message||'The server could not complete this request.';
  if(err instanceof ZodError){status=400;code='VALIDATION_ERROR';message='One or more fields are invalid. Check the field requirements and retry.';}
  else if(e.name==='ValidationError'){status=400;code='VALIDATION_ERROR';message='The supplied data does not meet the required constraints.';}
  else if(e.name==='CastError'){status=404;code='NOT_FOUND';message='The requested resource was not found.';}
  else if(e.code===11000){status=409;code='DUPLICATE_RESOURCE';message='A resource with one of these values already exists.';}
  else if(e.name==='MulterError'){status=e.code==='LIMIT_FILE_SIZE'?413:400;code=e.code||'UPLOAD_FAILED';message=status===413?'Image uploads must be 8 MB or smaller.':'The image upload was rejected.';}
  if(status>=500)console.error('[api]',code,message);
  res.status(status).json({error:{code,message:status>=500&&status!==503?'The server could not complete this request.':message}});
}
export const notFound=(_req:Request,res:Response)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Route not found.'}});
