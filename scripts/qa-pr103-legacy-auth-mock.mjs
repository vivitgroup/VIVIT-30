import http from 'node:http';

const users=new Map();
const workspaces=new Map();
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body))};
const readBody=req=>new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{try{resolve(data?JSON.parse(data):{})}catch(error){reject(error)}});req.on('error',reject)});
const eq=(url,key)=>{const value=url.searchParams.get(key);return value?.startsWith('eq.')?decodeURIComponent(value.slice(3)):''};

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(!url.pathname.startsWith('/rest/v1/'))return json(res,404,{error:'not_found'});
    const table=url.pathname.slice('/rest/v1/'.length);
    if(req.method==='GET'&&table==='workspaces')return json(res,200,[...workspaces.values()]);
    if(req.method==='POST'&&table==='workspaces'){
      const body=await readBody(req);workspaces.set(String(body.id),body);return json(res,201,{});
    }
    if(req.method==='POST'&&table==='users'){
      const body=await readBody(req);users.set(String(body.id),body);return json(res,201,{});
    }
    if(req.method==='GET'&&table==='users'){
      const id=eq(url,'id'),email=eq(url,'email');
      const rows=[...users.values()].filter(user=>(!id||String(user.id)===id)&&(!email||String(user.email).toLowerCase()===email.toLowerCase()));
      return json(res,200,rows.slice(0,1));
    }
    if(req.method==='GET'&&['audit_logs','user_role_assignments','user_permission_grants'].includes(table))return json(res,200,[]);
    return json(res,404,{error:'unsupported_test_endpoint',table,method:req.method});
  }catch(error){return json(res,500,{error:error instanceof Error?error.message:'mock_failure'})}
});
server.listen(3002,'127.0.0.1',()=>console.log('PR103 legacy auth mock listening on 3002'));
const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);
