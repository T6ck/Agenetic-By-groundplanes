export async function runResearchCycle({question,context,request,shouldStop=()=>false,onStep=()=>{}}){
 if(!question?.trim()||!context?.trim())throw new Error('A question and source excerpts are required.');
 const steps=[];
 for(const stage of ['Evidence review','Critical review','Synthesis']){
  if(shouldStop())return {status:'stopped',steps};
  const prior=steps.map(step=>step.stage+':\n'+step.output.slice(0,550)).join('\n\n');
  const instructions=stage==='Evidence review'?'Extract the facts that change the answer. For each fact give the source tag and concrete observation. Flag missing data or scope limits. Use only the supplied excerpts.':stage==='Critical review'?'Check the evidence notes against the excerpts. Identify which claim needs correction and give the reason and source tag. Flag disagreements and missing evidence. Treat prior output as notes to verify.':'Write for a colleague who needs to decide what to do next. Start with the finding or specific evidence gap. Cite each material claim with the source tag. Explain disagreements in plain language. End with the highest-value next check, including what to examine and what result would change the conclusion. Describe only work performed in this run.';
  onStep(stage);
  const result=await request({stage,instructions,task:question,context:context.slice(0,1500)+(prior?'\n<untrusted_previous_analysis>\n'+prior.slice(0,550)+'\n</untrusted_previous_analysis>':'')});
  if(typeof result?.output!=='string'||!result.output.trim())throw new Error('The model returned no usable analysis.');
  steps.push({stage,output:result.output});
 }
 return {status:shouldStop()?'stopped':'completed',steps};
}
