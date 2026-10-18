import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env, isProduction } from './config.js';
import { User } from './models.js';
import { HttpError } from './errors.js';

const COOKIE='vizzy_session';
export function ensureAuthConfigured(){if(!env.JWT_SECRET||env.JWT_SECRET.length<32)throw new HttpError(503,'Authentication is not configured: set a random JWT_SECRET of at least 32 characters.','AUTH_NOT_CONFIGURED');}
function secret(){ ensureAuthConfigured(); return env.JWT_SECRET!; }
function cookieOptions(){return {httpOnly:true,secure:isProduction,sameSite:(isProduction?'none':'lax') as 'none'|'lax',path:'/',maxAge:7*24*60*60*1000};}
export function setSessionCookie(res:Response,userId:string){const token=jwt.sign({sub:userId},secret(),{expiresIn:'7d',issuer:'vizzy-studio',audience:'vizzy-web'});res.cookie(COOKIE,token,cookieOptions());}
export function clearSessionCookie(res:Response){res.clearCookie(COOKIE,{httpOnly:true,secure:isProduction,sameSite:isProduction?'none':'lax',path:'/'});}
export interface AuthRequest extends Request { userId?: Types.ObjectId; }
export function requireAuth(req:AuthRequest,_res:Response,next:NextFunction){
  try{const token=req.cookies?.[COOKIE];if(!token)throw new HttpError(401,'Please sign in to continue.','UNAUTHENTICATED');const decoded=jwt.verify(token,secret(),{issuer:'vizzy-studio',audience:'vizzy-web'}) as jwt.JwtPayload;if(typeof decoded.sub!=='string'||!Types.ObjectId.isValid(decoded.sub))throw new HttpError(401,'Session is invalid. Please sign in again.','INVALID_SESSION');req.userId=new Types.ObjectId(decoded.sub);next();}catch(e){next(e instanceof HttpError?e:new HttpError(401,'Session expired. Please sign in again.','INVALID_SESSION'));}
}
export async function register(name:string,email:string,password:string){
 ensureAuthConfigured();const normalized=email.trim().toLowerCase();if(await User.exists({email:normalized}))throw new HttpError(409,'An account with this email already exists.','EMAIL_TAKEN');
 const user=await User.create({name:name.trim(),email:normalized,passwordHash:await bcrypt.hash(password,12)});return user;
}
export async function authenticate(email:string,password:string){
 ensureAuthConfigured();const user=await User.findOne({email:email.trim().toLowerCase()}).select('+passwordHash');if(!user||!await bcrypt.compare(password,user.passwordHash))throw new HttpError(401,'Email or password is incorrect.','INVALID_CREDENTIALS');return user;
}
export function publicUser(user:{_id:unknown;name:string;email:string}){return{id:String(user._id),name:user.name,email:user.email};}
