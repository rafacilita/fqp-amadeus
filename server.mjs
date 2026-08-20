import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
const host='127.0.0.1',port=Number(process.env.PORT||4180),root=resolve('.');
const allowed=new Set(['/index.html','/style.css','/app.js','/fqp-core.js']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
createServer(async(req,res)=>{const requested=new URL(req.url||'/',`http://${host}:${port}`).pathname;const path=requested==='/'?'/index.html':requested;if(!allowed.has(path)){res.writeHead(404);return res.end('Não encontrado.')}try{const body=await readFile(resolve(root,path.slice(1)));res.writeHead(200,{'Content-Type':types[extname(path)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body)}catch{res.writeHead(500);res.end('Erro ao carregar arquivo.')}}).listen(port,host,()=>console.log(`Gerador FQP: http://${host}:${port}/`));
