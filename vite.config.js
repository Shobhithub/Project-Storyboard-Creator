import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const pagesBase = process.env.GITHUB_ACTIONS ? '/Project-Storyboard-Creator/' : '/';
export default defineConfig({ base: pagesBase, plugins:[react(),tailwindcss()], server:{host:'0.0.0.0', allowedHosts:true, proxy:{'/api':'http://127.0.0.1:3001'}} });
