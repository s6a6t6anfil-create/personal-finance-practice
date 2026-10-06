import '../styles/components/metric.scss';
export default function MetricCard({label,value,detail}){return <article className="metric"><p>{label}</p><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>;}
