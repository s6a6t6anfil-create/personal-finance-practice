import Field from './Field';import {inputMoney,parseMoney} from '../utils/money';import {useEffect,useState} from 'react';import '../styles/components/form.scss';
const initial=()=>({name:'',kind:'expense',amount:'',categoryId:'',occurredOn:new Date().toLocaleDateString('en-CA'),note:'',month:new Date().toISOString().slice(0,7)});
export default function ResourceForm({resource,categories,row,busy,onSave,onCancel}){
 const [form,setForm]=useState(initial),[error,setError]=useState('');
 useEffect(()=>{setForm(row?{...initial(),...row,amount:inputMoney(row.amountCents??row.limitCents??0)}:initial());setError('');},[row,resource]);
 const set=(key,e)=>setForm({...form,[key]:e.target.value});
 async function submit(e){e.preventDefault();setError('');try{let data;
 if(resource==='categories')data={name:form.name.trim()};
 else {const categoryId=Number(form.categoryId);if(!categoryId)throw new Error('Оберіть категорію.');
 data=resource==='budgets'?{categoryId,month:form.month,limitCents:parseMoney(form.amount)}:{categoryId,kind:form.kind,amountCents:parseMoney(form.amount),occurredOn:form.occurredOn,note:form.note};}
 await onSave(data,row?.id);
 }catch(e){setError(e.message);}}
 return <form className="resource-form" onSubmit={submit}><h2>{row?'Редагування запису':'Новий запис'}</h2>{resource==='categories'?<Field label="Назва категорії"><input required maxLength={80} value={form.name} onChange={e=>set('name',e)}/></Field>:<>
 <Field label="Категорія"><select required value={form.categoryId} onChange={e=>set('categoryId',e)}><option value="">Оберіть категорію</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
 {resource==='transactions'&&<Field label="Тип операції"><select value={form.kind} onChange={e=>set('kind',e)}><option value="expense">Витрата</option><option value="income">Дохід</option></select></Field>}
 <Field label={resource==='budgets'?'Ліміт, грн':'Сума, грн'}><input required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={e=>set('amount',e)}/></Field>
 <Field label={resource==='budgets'?'Місяць':'Дата'}><input required type={resource==='budgets'?'month':'date'} min={resource==='budgets'?'1900-01':'1900-01-01'} value={resource==='budgets'?form.month:form.occurredOn} onChange={e=>set(resource==='budgets'?'month':'occurredOn',e)}/></Field>
 {resource==='transactions'&&<Field label="Примітка"><textarea maxLength={500} value={form.note} onChange={e=>set('note',e)}/></Field>}</>}
 {error&&<p role="alert" className="form-error">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>{busy?'Збереження…':'Зберегти'}</button>{row&&<button type="button" onClick={onCancel} disabled={busy}>Скасувати</button>}</div></form>;
}
