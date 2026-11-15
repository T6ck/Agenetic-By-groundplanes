const repoPattern=/^[\w.-]+\/[\w.-]+$/;
export async function modelCatalog(params,fetcher=fetch){
 const repo=params.get('repo'),query=params.get('query')||'',revision=params.get('revision');
 if(repo&&!repoPattern.test(repo))throw new Error('Use a publisher/model repository ID.');
 if(revision&&!/^[a-f0-9]{40}$/.test(revision))throw new Error('Use an exact model revision.');
 if(query.length>100)throw new Error('Keep your search under 100 characters.');
 const url=repo?new URL('https://huggingface.co/api/models/'+repo+(revision?'/revision/'+revision:'')):new URL('https://huggingface.co/api/models');
 if(repo)url.searchParams.set('blobs','true');else for(const [k,v] of Object.entries({search:query,filter:'gguf',limit:'20',sort:'downloads',direction:'-1'}))url.searchParams.set(k,v);
 let response;try{response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'manual'})}catch{throw new Error('Model search could not reach Hugging Face. Retry shortly, or connect your local companion to search directly.')}
 if(!response.ok)throw new Error(response.status===429?'Hugging Face is rate limiting searches. Try again shortly.':response.status===404?'Repository not found. Check the publisher/model name.':'Hugging Face is unavailable or this repository requires access. Try a public repository.');
 const raw=await response.text();if(raw.length>4000000)throw new Error('This repository is too large to inspect here. Open its model card.');const result=JSON.parse(raw);
 if(!repo){if(!Array.isArray(result))throw new Error('Unexpected model search response.');return {models:result.filter(m=>repoPattern.test(m.id)).map(m=>({repo:m.id,downloads:Number(m.downloads)||0})).slice(0,20)}}
 if(!/^[a-f0-9]{40}$/.test(result.sha))throw new Error('The repository did not supply a pinned revision.');
 return {repo,revision:result.sha,license:String(result.cardData?.license||'Not specified'),gated:!!result.gated,files:(result.siblings||[]).filter(f=>typeof f.rfilename==='string'&&f.rfilename.toLowerCase().endsWith('.gguf')).map(f=>({filename:f.rfilename,size:Number(f.size||f.lfs?.size)||0,supported:!/-\d{5}-of-\d{5}\.gguf$/.test(f.rfilename)}))};
}
