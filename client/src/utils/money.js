export function parseMoney(value) {
 const s=String(value).trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error('Вкажіть додатну суму з не більше ніж двома знаками після коми.');
 const [whole,fraction='']=s.split('.'); const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<1||cents>1000000000) throw new Error('Сума має бути від 0,01 до 10 000 000 грн.');
 return cents;
}
export const money=v=>v===null||v===undefined?'—':new Intl.NumberFormat('uk-UA',{style:'currency',currency:'UAH'}).format(v/100);
export const inputMoney=v=>(v/100).toFixed(2);
