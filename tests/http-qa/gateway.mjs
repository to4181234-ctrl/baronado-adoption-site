import http from 'node:http';
http.createServer((req,res)=>{let port,prefix;if(req.url.startsWith('/rest/v1/')){port=55433;prefix='/rest/v1';}else if(req.url.startsWith('/storage/v1/')){port=55434;prefix='/storage/v1';}else{res.writeHead(404).end();return;}
const proxy=http.request({host:'127.0.0.1',port,path:req.url.slice(prefix.length),method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});proxy.on('error',()=>res.writeHead(502).end('{}'));req.pipe(proxy);
}).listen(55435,'127.0.0.1');
