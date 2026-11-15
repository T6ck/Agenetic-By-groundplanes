import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../../chatgpt-auth';
import {handleCommunity} from './service';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getChatGPTUser();return handleCommunity(request,env.DB,user?.userId||null,{signIn:chatGPTSignInPath('/?community=1'),signOut:chatGPTSignOutPath('/')},String((env as unknown as {COMMUNITY_MODERATOR_IDS?:string}).COMMUNITY_MODERATOR_IDS||'').split(',').map(x=>x.trim()).filter(Boolean))}
export const GET=handle;export const POST=handle;export const DELETE=handle;
