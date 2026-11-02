export type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col rounded-[20px] border border-app-border bg-app-surface p-6 shadow-app-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-app-card">
      <span className="mb-3 text-3xl" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-bold text-app-text">{title}</h3>
      <p className="mt-2 text-sm text-app-text-muted">{description}</p>
    </div>
  );
}
