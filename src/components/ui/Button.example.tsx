/**
 * Button Component Usage Examples
 * 
 * This file demonstrates all the variants, sizes, and states of the Button component.
 */

import { Button } from './Button';

// Example icons (you can replace these with your actual icon components)
const SaveIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SettingsIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function ButtonExamples() {
  return (
    <div className="p-8 space-y-12 bg-gray-50">
      {/* Variants */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Variants</h2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="icon" icon={<SettingsIcon />} aria-label="Settings" />
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Sizes</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <Button size="small">Small</Button>
          <Button size="medium">Medium</Button>
          <Button size="large">Large</Button>
        </div>
      </section>

      {/* With Icons */}
      <section>
        <h2 className="text-2xl font-bold mb-4">With Icons</h2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary" icon={<SaveIcon />}>Save Changes</Button>
          <Button variant="secondary" icon={<RefreshIcon />}>Refresh</Button>
          <Button variant="ghost" icon={<SettingsIcon />}>Settings</Button>
        </div>
      </section>

      {/* States */}
      <section>
        <h2 className="text-2xl font-bold mb-4">States</h2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary">Normal</Button>
          <Button variant="primary" loading>Loading...</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Loading States</h2>
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary" loading>Saving...</Button>
          <Button variant="secondary" loading>Loading...</Button>
          <Button variant="ghost" loading>Processing...</Button>
        </div>
      </section>

      {/* Icon Buttons */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Icon Buttons</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <Button variant="icon" size="small" icon={<SettingsIcon />} aria-label="Settings" />
          <Button variant="icon" size="medium" icon={<SettingsIcon />} aria-label="Settings" />
          <Button variant="icon" size="large" icon={<SettingsIcon />} aria-label="Settings" />
        </div>
      </section>

      {/* Real-world Examples */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Real-world Examples</h2>
        <div className="space-y-4">
          {/* Form Actions */}
          <div className="flex gap-2">
            <Button variant="primary" icon={<SaveIcon />}>Save Changes</Button>
            <Button variant="secondary">Cancel</Button>
          </div>

          {/* Toolbar */}
          <div className="flex gap-2">
            <Button variant="icon" icon={<RefreshIcon />} aria-label="Refresh" />
            <Button variant="icon" icon={<SettingsIcon />} aria-label="Settings" />
          </div>

          {/* Loading Action */}
          <div className="flex gap-2">
            <Button variant="primary" loading icon={<SaveIcon />}>
              Saving Changes...
            </Button>
          </div>
        </div>
      </section>

      {/* All Combinations */}
      <section>
        <h2 className="text-2xl font-bold mb-4">All Combinations</h2>
        <div className="space-y-4">
          {(['primary', 'secondary', 'ghost'] as const).map((variant) => (
            <div key={variant} className="space-y-2">
              <h3 className="text-lg font-semibold capitalize">{variant}</h3>
              <div className="flex gap-4 items-center flex-wrap">
                <Button variant={variant} size="small">Small</Button>
                <Button variant={variant} size="medium">Medium</Button>
                <Button variant={variant} size="large">Large</Button>
                <Button variant={variant} size="medium" loading>Loading</Button>
                <Button variant={variant} size="medium" disabled>Disabled</Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
