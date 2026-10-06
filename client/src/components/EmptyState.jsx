import '../styles/components/empty.scss';
export default function EmptyState({title='Записів ще немає',description='Додайте перший запис через форму.'}){return <div className="empty"><h3>{title}</h3><p>{description}</p></div>;}
