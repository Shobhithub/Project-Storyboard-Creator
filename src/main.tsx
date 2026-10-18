import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import App from './Studio';
import { AuthPage, Welcome } from './Auth';
import './styles.css';

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30_000,retry:1,refetchOnWindowFocus:false}}});
const STATIC_DEMO=import.meta.env.VITE_STATIC_DEMO==='1';
type User={id:string;name:string;email:string};
function ProtectedStudio(){const q=useQuery<User|null>({queryKey:['auth','me'],enabled:!STATIC_DEMO,retry:false,queryFn:async()=>{const r=await fetch('/api/auth/me',{credentials:'include'});if(r.status===401)return null;const payload=await r.json();if(!r.ok)throw Error(payload.error?.message||'Unable to verify your session.');return payload.data;}});if(STATIC_DEMO)return <App/>;if(q.isLoading)return <div className="auth-loading"><span className="auth-brandmark">v.</span><span>Opening your studio…</span></div>;if(q.isError)return <div className="auth-loading auth-load-error"><b>Studio connection unavailable</b><span>{(q.error as Error).message}</span><button onClick={()=>q.refetch()}>Try again</button></div>;if(!q.data)return <Navigate to="/login" replace/>;const logout=async()=>{await fetch('/api/auth/logout',{method:'POST',credentials:'include'});await queryClient.invalidateQueries({queryKey:['auth','me']});};return <App user={q.data} onLogout={logout}/>;}
function AuthScreen(){const q=useQuery<User|null>({queryKey:['auth','me'],enabled:!STATIC_DEMO,retry:false,queryFn:async()=>{const r=await fetch('/api/auth/me',{credentials:'include'});if(r.status===401)return null;const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Authentication service is unavailable.');return d.data;}});const qc=useQueryClient();if(STATIC_DEMO)return <Navigate to="/" replace/>;if(q.isLoading)return <div className="auth-loading">Checking your studio…</div>;if(q.data)return <Navigate to="/" replace/>;return <AuthPage onSuccess={user=>qc.setQueryData(['auth','me'],user)}/>;}
function AppRouter(){return <BrowserRouter basename={import.meta.env.BASE_URL}><Routes><Route path="/welcome" element={<Welcome/>}/><Route path="/login" element={<AuthScreen/>}/><Route path="/register" element={<AuthScreen/>}/><Route path="/" element={<ProtectedStudio/>}/><Route path="*" element={<Navigate to={STATIC_DEMO?'/':'/login'} replace/>}/></Routes></BrowserRouter>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><AppRouter/></QueryClientProvider></React.StrictMode>);
