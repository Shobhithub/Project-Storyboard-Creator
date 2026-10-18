import { Types } from 'mongoose';
import { env } from './config.js';
import { Character, GenerationJob, ImageAsset, Page, Project } from './models.js';
import { buildScenePrompt, generateImage } from './ai.js';
import { HttpError } from './errors.js';
import { deleteImage, readImage, saveImage } from './storage.js';

let active=0;let timer:NodeJS.Timeout|undefined;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function assetBuffer(asset:{storageKey:string;mimeType:string;storageProvider?:string}){
  return{buffer:await readImage(asset.storageKey,asset.storageProvider||'local',asset.mimeType),mimeType:asset.mimeType};
}
function publicError(err:unknown){
  if(err instanceof HttpError)return{code:err.code,message:err.message};
  const e=err as {message?:string};
  console.error('[generation-provider]',e.message||'unknown failure');
  return{code:'GENERATION_FAILED',message:'Image generation failed unexpectedly. Check the server logs and retry.'};
}
async function cleanJobAssets(jobId:Types.ObjectId){
  const assets=await ImageAsset.find({generationJobId:jobId}).lean();
  await Promise.all(assets.map(asset=>deleteImage(asset.storageKey,asset.storageProvider||'local').catch(error=>console.error('[asset-cleanup]',(error as Error).message))));
  await ImageAsset.deleteMany({generationJobId:jobId});
}
async function processOne(){
  const job=await GenerationJob.findOneAndUpdate({status:'queued'},{$set:{status:'processing',startedAt:new Date()},$inc:{attempts:1}},{sort:{createdAt:1},new:true});
  if(!job)return;
  try{
    // Recover outputs persisted before a process restart instead of repeating paid provider work.
    const recovered=await ImageAsset.find({generationJobId:job._id}).sort({alternativeIndex:1}).lean();
    if(recovered.length===job.alternativeCount&&recovered.every((asset,index)=>asset.alternativeIndex===index)){
      job.assetIds=recovered.map(asset=>asset._id);job.status='completed';job.finishedAt=new Date();job.usageMetadata={alternativeCount:recovered.length,recoveredAfterRestart:true};await job.save();
      await Page.updateOne({_id:job.pageId},{$set:{status:'review'}});return;
    }
    if(recovered.length){await cleanJobAssets(job._id);job.assetIds=[];await job.save();}
    const [project,page]=await Promise.all([Project.findById(job.projectId),Page.findById(job.pageId)]);
    if(!project||!page)throw new Error('The project or page no longer exists.');
    const characters=await Character.find({_id:{$in:page.characterIds}}).lean();
    const recent=await Page.find({projectId:project._id,status:'approved',order:{$lt:page.order}}).sort({order:-1}).limit(3).lean();
    const scenePrompt=buildScenePrompt(project,page,characters,recent.reverse().map(previous=>`${previous.title}: ${previous.sceneDescription}`));
    const prompt=job.operation==='refine'?job.prompt:[scenePrompt,job.prompt].filter(Boolean).join('\nCreator direction: ');
    const parent=job.parentAssetId?await ImageAsset.findById(job.parentAssetId).lean():null;
    if(job.operation==='refine'&&!parent)throw new Error('The source image for this refinement is missing.');
    const referenceAssets=parent?[parent]:await ImageAsset.find({_id:{$in:characters.flatMap(character=>character.referenceAssetIds)},projectId:project._id}).lean();
    const references=await Promise.all(referenceAssets.slice(0,4).map(assetBuffer));
    const results=await Promise.all(Array.from({length:job.alternativeCount},async(_,index)=>{
      let lastError:unknown;
      for(let attempt=0;attempt<2;attempt++){
        try{return await generateImage(`${prompt}${job.alternativeCount>1?`\nComposition variation ${index+1} of ${job.alternativeCount}; preserve the described visual continuity.`:''}`,references);}
        catch(error){lastError=error;const status=(error as {status?:number})?.status;if(attempt===0&&(status===429||(status||0)>=500))await sleep(1500);else break;}
      }
      throw lastError;
    }));
    for(const [alternativeIndex,result] of results.entries()){
      const stored=await saveImage(result.buffer,result.mimeType);let assetId:Types.ObjectId|undefined;
      try{
        const version=await ImageAsset.countDocuments({pageId:page._id});assetId=new Types.ObjectId();
        const asset=await ImageAsset.create({_id:assetId,projectId:project._id,pageId:page._id,storageUrl:`/api/assets/${assetId}/file`,storageKey:stored.key,provider:result.provider,storageProvider:stored.provider,model:result.model,prompt,parentAssetId:parent?._id,generationJobId:job._id,alternativeIndex,generationParameters:{operation:job.operation,alternativeCount:job.alternativeCount,...result.usage},version:version+1,status:'ready',mimeType:stored.mimeType,byteSize:stored.byteSize});
        job.assetIds.push(asset._id);await job.save();
      }catch(error){if(assetId)await ImageAsset.deleteOne({_id:assetId}).catch(()=>{});await deleteImage(stored.key,stored.provider).catch(()=>{});throw error;}
    }
    job.status='completed';job.finishedAt=new Date();job.usageMetadata={alternativeCount:job.assetIds.length};job.errorCode=undefined;job.errorMessage=undefined;await job.save();
    page.status='review';await page.save();
  }catch(error){
    await cleanJobAssets(job._id).catch(cleanupError=>console.error('[asset-cleanup]',(cleanupError as Error).message));
    job.assetIds=[];const safe=publicError(error);job.status='failed';job.errorCode=safe.code;job.errorMessage=safe.message.slice(0,500);job.finishedAt=new Date();await job.save();
    await Page.updateOne({_id:job.pageId},{$set:{status:'failed'}});
  }
}
async function tick(){
  if(active>=env.GENERATION_CONCURRENCY)return;active++;
  try{await processOne();}catch(error){console.error('[generation-worker]',(error as Error).message);}finally{active--;}
}
export async function startGenerationWorker(){
  await GenerationJob.updateMany({status:'processing'},{$set:{status:'queued',startedAt:null}});
  timer=setInterval(()=>void tick(),750);void tick();
}
export function stopGenerationWorker(){if(timer)clearInterval(timer);}
