import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { buildScenePrompt } from './ai.js';

describe('API boundary behavior',()=>{
  it('reports database readiness without claiming a disconnected database is healthy',async()=>{
    const response=await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ok:false,database:'disconnected'});
  });
  it('protects project data before attempting a database read',async()=>{
    const response=await request(app).get('/api/projects');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
  it('uses safe 404 responses for missing API routes',async()=>{
    const response=await request(app).get('/api/not-a-route');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('image prompt construction',()=>{
  it('uses the project style, scene, relevant character details and recent approved context',()=>{
    const characterId='character-1';
    const prompt=buildScenePrompt({title:'Salt & Signal',genre:'Historical graphic novel',storyNotes:'A radio operator on D-Day.',styleGuide:{artStyle:'Painterly ink',palette:'Storm blue and sepia',lighting:'Blue hour',rendering:'Gouache texture',aspectRatio:'landscape',composition:'Wide frame',negativeInstructions:'No text.'}} as any,{title:'Before dawn',sceneDescription:'Eva sees the fleet.',visualPrompt:'A lighthouse and a distant horizon.',characterIds:[characterId]} as any,[{_id:characterId,name:'Eva',appearance:'Dark wavy hair, hazel eyes',description:'Small eyebrow scar',clothing:'Navy wool uniform'}] as any,['Previous scene: a quiet radio hut.']);
    expect(prompt).toContain('Painterly ink');
    expect(prompt).toContain('A lighthouse and a distant horizon');
    expect(prompt).toContain('Navy wool uniform');
    expect(prompt).toContain('quiet radio hut');
    expect(prompt).toContain('No text.');
  });
});
