import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();let scope='guest';if(user){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('agenetic-profile:'+user.userId));scope=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('')}
return Response.json({signedIn:!!user,scope,signIn:chatGPTSignInPath('/?community=1'),signOut:chatGPTSignOutPath('/')},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
