import { CATEGORY_TABS, CatalogCategory } from '../../data/catalog';

export function CategoryTabs({ active, onChange }: {
  active: CatalogCategory; onChange: (c: CatalogCategory) => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      {CATEGORY_TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
            active === t.id
              ? 'bg-[var(--matcha-800)] text-white font-semibold'
              : 'bg-[var(--cookie-100)] text-[var(--taupe)] hover:bg-[var(--cookie-100)]/70'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
