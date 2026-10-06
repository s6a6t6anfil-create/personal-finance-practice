import '../styles/components/field.scss';
export default function Field({label,error,children}){return <label className="field"><span>{label}</span>{children}{error&&<small role="alert">{error}</small>}</label>;}
