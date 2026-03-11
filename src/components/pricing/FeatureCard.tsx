const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

export type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className="flex flex-col rounded-[20px] border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: BORDER, padding: '24px' }}
    >
      <span className="mb-3 text-3xl" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-bold" style={{ color: TEXT }}>
        {title}
      </h3>
      <p className="mt-2 text-sm" style={{ color: TEXT_SECONDARY }}>
        {description}
      </p>
    </div>
  );
}
