export async function runResearchCycle({question,context,request,shouldStop=()=>false,onStep=()=>{}}){
 if(!question?.trim()||!context?.trim())throw new Error('A question and source excerpts are required.');
 const steps=[];
 for(const stage of ['Evidence review','Critical review','Synthesis']){
  if(shouldStop())return {status:'stopped',steps};
  const prior=steps.at(-1)?.output||'';
  const instructions=stage==='Evidence review'?'Identify evidence relevant to the question. Cite exact filenames. List gaps; do not invent findings.':stage==='Critical review'?'Critique the previous analysis against the original sources. Identify unsupported claims, contradictions and missing evidence. Cite filenames.':'Answer the question using the sources and critique. Separate supported findings, uncertainties and next research steps. Cite exact filenames. Never claim outside research was performed.';
  onStep(stage);
  const result=await request({stage,instructions,task:question,context:context.slice(0,8000)+(prior?'\n<untrusted_previous_analysis>\n'+prior.slice(0,3800)+'\n</untrusted_previous_analysis>':'')});
  if(typeof result?.output!=='string'||!result.output.trim())throw new Error('The model returned no usable analysis.');
  steps.push({stage,output:result.output});
 }
 return {status:shouldStop()?'stopped':'completed',steps};
}
