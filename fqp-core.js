const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
export const RELATION_SEPARATOR={connection:'',stopover:'-',surface:'---'};

export function normalizeCode(value){return String(value??'').trim().toUpperCase()}

function parseDate(value){
 if(value instanceof Date)return Number.isNaN(value.getTime())?null:value;
 const match=String(value??'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!match)return null;
 const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);
 return date.getFullYear()===Number(match[1])&&date.getMonth()===Number(match[2])-1&&date.getDate()===Number(match[3])?date:null;
}

export function formatAmadeusDate(value,includeYear=false){
 const date=parseDate(value);
 if(!date)return '';
 return `${String(date.getDate()).padStart(2,'0')}${MONTHS[date.getMonth()]}${includeYear?String(date.getFullYear()).slice(-2):''}`;
}

export function validateFqp(itinerary,originalIssueDate){
 const errors=[];const warnings=[];
 if(!formatAmadeusDate(originalIssueDate,true))errors.push('Informe uma data original de emissão válida.');
 if(!Array.isArray(itinerary)||!itinerary.length)errors.push('Adicione pelo menos um trecho.');
 (itinerary||[]).forEach((raw,index)=>{
  const segment={...raw,origin:normalizeCode(raw.origin),destination:normalizeCode(raw.destination),airline:normalizeCode(raw.airline),bookingClass:normalizeCode(raw.bookingClass)};
  const label=`Trecho ${index+1}`;
  if(!/^[A-Z]{3}$/.test(segment.origin))errors.push(`${label}: origem deve ter exatamente 3 letras.`);
  if(!/^[A-Z]{3}$/.test(segment.destination))errors.push(`${label}: destino deve ter exatamente 3 letras.`);
  if(!formatAmadeusDate(segment.date))errors.push(`${label}: informe uma data válida.`);
  if(!/^[A-Z0-9]{2}$/.test(segment.airline))errors.push(`${label}: companhia deve ter 2 caracteres alfanuméricos.`);
  if(!/^[A-Z0-9]$/.test(segment.bookingClass))errors.push(`${label}: classe deve ter 1 caractere alfanumérico.`);
  if(index<(itinerary||[]).length-1&&!Object.hasOwn(RELATION_SEPARATOR,segment.relation))errors.push(`${label}: selecione a relação com o próximo trecho.`);
  const next=itinerary?.[index+1];
  if(next&&['connection','stopover'].includes(segment.relation)&&segment.destination&&normalizeCode(next.origin)&&segment.destination!==normalizeCode(next.origin))warnings.push(`Trecho ${index+2}: a origem do próximo trecho é diferente do destino anterior. Verifique se existe um Surface.`);
 });
 return {valid:errors.length===0,errors,warnings};
}

export function buildFqpDetails(itinerary,originalIssueDate){
 const validation=validateFqp(itinerary,originalIssueDate);
 if(!validation.valid)return {...validation,command:'',parts:[]};
 const segments=itinerary.map(segment=>({...segment,origin:normalizeCode(segment.origin),destination:normalizeCode(segment.destination),airline:normalizeCode(segment.airline),bookingClass:normalizeCode(segment.bookingClass)}));
 const parts=[{label:'Início',value:'FQP'},{label:'Origem',value:segments[0].origin}];
 let command=`FQP${segments[0].origin}`;let previousDate='';
 segments.forEach((segment,index)=>{
  const date=formatAmadeusDate(segment.date);
  let value=`${date===previousDate?'':`/D${date}`}/A${segment.airline}/C${segment.bookingClass}${segment.destination}`;
  command+=value;parts.push({label:`Trecho ${index+1}`,value});previousDate=date;
  if(index<segments.length-1){
   const separator=RELATION_SEPARATOR[segment.relation];
   if(segment.relation==='surface'){
    const value=`${separator}${segments[index+1].origin}`;command+=value;parts.push({label:'Surface',value});
   }else if(separator){command+=separator;parts.push({label:'Stopover',value:separator})}
  }
 });
 const retroactive=`/R,${formatAmadeusDate(originalIssueDate,true)}`;command+=retroactive;parts.push({label:'Data retroativa',value:retroactive});
 return {...validation,command,parts};
}

export function buildFqpCommand(itinerary,originalIssueDate){return buildFqpDetails(itinerary,originalIssueDate).command}
