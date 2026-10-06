import '../styles/components/status.scss';
export default function StatusMessage({error,loading,message,onRetry}){if(loading)return <p className="status" role="status">Завантаження…</p>;if(error)return <div className="status status--error" role="alert">{error}{onRetry&&<button onClick={onRetry}>Спробувати ще</button>}</div>;return message?<p className="status" role="status">{message}</p>:null;}
