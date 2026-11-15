import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');

export function readStudioCoreCss(){
 return readFileSync(join(root,'src/studio-core.css'),'utf8');
}

export function readStudioCss(){
 return readStudioCoreCss()+'\n'+readFileSync(join(root,'src/seq-ui.css'),'utf8');
}