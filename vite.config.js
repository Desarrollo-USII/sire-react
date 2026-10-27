import {pluginSire} from './server/sire.mjs';
import {pluginOffice} from './server/office.mjs';
import {defineConfig} from 'vite';
import {pluginExportacion} from './server/exportar.mjs';
export default defineConfig({esbuild:{jsx:'automatic'},server:{watch:{ignored:['**/server/cache-sire/**']}},plugins:[pluginExportacion(),pluginOffice(),pluginSire()]});


