export class FinanceApi {
 constructor(base='',fetcher=(...args)=>fetch(...args)){this.base=base.replace(/\/$/,'');this.fetcher=fetcher;}
 async request(path,options={}) {
  let response;
  try {response=await this.fetcher(this.base+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});}
  catch {throw new Error('Сервер недоступний. Перевірте з’єднання та запуск сервера.');}
  if(response.status===204)return null;
  let body; try{body=await response.json();}catch{throw new Error('Сервер повернув некоректну відповідь.');}
  if(!response.ok)throw new Error(body?.error?.message||`Помилка сервера (${response.status}).`);
  return body;
 }
 list(resource){return this.request(`/api/${resource}`);}
 save(resource,data,id){return this.request(`/api/${resource}${id?'/'+id:''}`,{method:id?'PUT':'POST',body:JSON.stringify(data)});}
 remove(resource,id){return this.request(`/api/${resource}/${id}`,{method:'DELETE'});}
 report(month){return this.request(`/api/reports?month=${encodeURIComponent(month)}`);}
}
export class Preferences {
 constructor(storage){this.storage=storage;}
 read(key,fallback){try{return this.storage.getItem(key)||fallback;}catch{return fallback;}}
 write(key,value){try{this.storage.setItem(key,value);}catch{/* Storage may be unavailable in private browsing. */}}
}
