import {defineConfig} from 'vite';
export default defineConfig({esbuild:{jsx:'automatic'},server:{proxy:{'/api':'http://127.0.0.1:3072','/health':'http://127.0.0.1:3072'}}});
