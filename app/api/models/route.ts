import {modelCatalog} from '../../../public/model-catalog.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json(await modelCatalog(new URL(request.url).searchParams),{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}})}catch(e){return Response.json({error:e instanceof Error?e.message:'Model search failed.'},{status:502,headers:{'Cache-Control':'no-store'}})}}
