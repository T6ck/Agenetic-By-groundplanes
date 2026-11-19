import {PRICES} from './rules.mjs';

export function checkoutConflict(items,price,quantity,expiresAt){
 const [item]=items.data;
 if(!items.has_more&&items.data.length===1&&item.price?.id===price&&item.quantity===quantity)return null;
 const term=Object.entries(PRICES).find(([,id])=>id===item?.price?.id)?.[0];
 const selection=term&&item.quantity&&items.data.length===1&&!items.has_more
  ?item.quantity+' seat(s) billed per '+term:'different billing terms';
 return 'The open checkout uses '+selection+'. Select the same terms to resume it, or change terms after it expires at '+new Date(expiresAt*1000).toISOString()+'.';
}
