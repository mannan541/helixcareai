import BackButton from './BackButton';

export default function PageHeader({ title, back, actions }: { title: string; back?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {back && <BackButton fallback={back} />}
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
