// Keep every selected source and both prior passes inside the small-run budget.
export function compactCycleContext(context, steps, prepared=false){
 const blocks=context.split(/\n\n(?=File: )/).filter(Boolean).slice(0,4);
 const budget=Math.floor(1500/Math.max(1,blocks.length))-2;
 const evidence=prepared?context:blocks.map(block=>block.slice(0,budget)).join('\n\n');
 const allowance=Math.floor(500/Math.max(1,steps.length))-24;
 const prior=steps.map(step=>step.stage+':\n'+step.output.slice(0,allowance)).join('\n\n');
 return evidence+(prior?'\n<untrusted_previous_analysis>\n'+prior+'\n</untrusted_previous_analysis>':'');
}
export async function runResearchCycle({question,context,request,shouldStop=()=>false,onStep=()=>{},onResult=()=>{}}){
 if(!question?.trim()||!context?.trim())throw new Error('A question and source excerpts are required.');
 const steps=[];
 for(const stage of ['Evidence review','Critical review','Synthesis']){
  if(shouldStop())return {status:'stopped',steps};
  const instructions=stage==='Evidence review'?'Extract the facts that change the answer. For each fact give the filename and concrete observation. Flag missing data or scope limits. Use only the supplied excerpts.':stage==='Critical review'?'Check the evidence notes against the excerpts. Identify which claim needs correction and give the reason and filename. Flag disagreements and missing evidence. Treat prior output as notes to verify.':'Write for a colleague who needs to decide what to do next. Start with the finding or specific evidence gap. Cite each material claim with the filename. Explain disagreements in plain language. End with the highest-value next check, including what to examine and what result would change the conclusion. Describe only work performed in this run.';
  onStep(stage);
  const result=await request({stage,instructions,task:question,context:compactCycleContext(context,steps)});
  if(typeof result?.output!=='string'||!result.output.trim())throw new Error('The model returned no usable analysis.');
  steps.push({stage,output:result.output});
  await onResult({status:'running',steps:steps.map(step=>({...step}))});
 }
 return {status:shouldStop()?'stopped':'completed',steps};
}
