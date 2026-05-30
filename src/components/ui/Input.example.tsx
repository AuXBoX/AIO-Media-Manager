/**
 * Input Component Usage Examples
 * 
 * This file demonstrates all the variants, states, and features of the Input component.
 */

import { useState } from 'react';
import { Input } from './Input';

// Example icons (you can replace these with your actual icon components)
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function InputExamples() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="p-8 space-y-12 bg-background-primary min-h-screen">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Basic Inputs */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Basic Inputs</h2>
          <div className="space-y-4">
            <Input placeholder="Simple input without label" />
            <Input label="Title" placeholder="Enter title..." />
            <Input 
              label="Description" 
              placeholder="Enter description..."
              hint="This will be displayed to users"
            />
          </div>
        </section>

        {/* With Icons */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">With Icons</h2>
          <div className="space-y-4">
            <Input 
              label="Search" 
              placeholder="Search items..."
              leftIcon={<SearchIcon />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input 
              label="Email Address" 
              type="email"
              placeholder="you@example.com"
              leftIcon={<EmailIcon />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input 
              label="Password" 
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password..."
              leftIcon={<LockIcon />}
              rightIcon={
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pointer-events-auto"
                >
                  <EyeIcon />
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </section>

        {/* States */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">States</h2>
          <div className="space-y-4">
            <Input 
              label="Normal State" 
              placeholder="Normal input"
            />
            <Input 
              label="With Value" 
              value="This input has a value"
              onChange={() => {}}
            />
            <Input 
              label="Disabled State" 
              placeholder="This input is disabled"
              disabled
            />
            <Input 
              label="Error State" 
              placeholder="Enter username..."
              error="Username is required"
            />
            <Input 
              label="Success State" 
              placeholder="Enter email..."
              value="user@example.com"
              rightIcon={<CheckIcon />}
              hint="Email is valid"
              onChange={() => {}}
            />
          </div>
        </section>

        {/* Input Types */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Input Types</h2>
          <div className="space-y-4">
            <Input 
              label="Text Input" 
              type="text"
              placeholder="Enter text..."
            />
            <Input 
              label="Email Input" 
              type="email"
              placeholder="you@example.com"
              leftIcon={<EmailIcon />}
            />
            <Input 
              label="Password Input" 
              type="password"
              placeholder="Enter password..."
              leftIcon={<LockIcon />}
            />
            <Input 
              label="Number Input" 
              type="number"
              placeholder="Enter number..."
            />
            <Input 
              label="URL Input" 
              type="url"
              placeholder="https://example.com"
            />
            <Input 
              label="Search Input" 
              type="search"
              placeholder="Search..."
              leftIcon={<SearchIcon />}
            />
          </div>
        </section>

        {/* Error States */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Error States</h2>
          <div className="space-y-4">
            <Input 
              label="Username" 
              error="Username is required"
              leftIcon={<XIcon />}
            />
            <Input 
              label="Email" 
              type="email"
              value="invalid-email"
              error="Please enter a valid email address"
              leftIcon={<EmailIcon />}
              onChange={() => {}}
            />
            <Input 
              label="Password" 
              type="password"
              value="123"
              error="Password must be at least 8 characters"
              leftIcon={<LockIcon />}
              onChange={() => {}}
            />
          </div>
        </section>

        {/* Form Example */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Form Example</h2>
          <form className="space-y-4 bg-white p-6 rounded-xl border border-border shadow-soft">
            <h3 className="text-lg font-semibold text-text-primary mb-4">User Registration</h3>
            
            <Input 
              label="Full Name" 
              placeholder="John Doe"
              required
            />
            
            <Input 
              label="Email Address" 
              type="email"
              placeholder="you@example.com"
              leftIcon={<EmailIcon />}
              hint="We'll never share your email"
              required
            />
            
            <Input 
              label="Password" 
              type="password"
              placeholder="Enter password..."
              leftIcon={<LockIcon />}
              hint="Must be at least 8 characters"
              required
            />
            
            <Input 
              label="Confirm Password" 
              type="password"
              placeholder="Confirm password..."
              leftIcon={<LockIcon />}
              required
            />
            
            <div className="flex gap-2 pt-4">
              <button 
                type="submit"
                className="px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Create Account
              </button>
              <button 
                type="button"
                className="px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-background-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        {/* Focus States Demo */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Focus States</h2>
          <div className="space-y-4 bg-white p-6 rounded-xl border border-border shadow-soft">
            <p className="text-sm text-text-secondary mb-4">
              Click on each input to see the focus ring effect (blue ring with 3px width)
            </p>
            <Input 
              label="Normal Focus" 
              placeholder="Click to see focus ring"
            />
            <Input 
              label="Error Focus" 
              placeholder="Click to see error focus ring"
              error="This field has an error"
            />
            <Input 
              label="With Icon Focus" 
              placeholder="Click to see focus ring"
              leftIcon={<SearchIcon />}
            />
          </div>
        </section>

        {/* Responsive Example */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-text-primary">Responsive Layout</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="First Name" 
              placeholder="John"
            />
            <Input 
              label="Last Name" 
              placeholder="Doe"
            />
            <Input 
              label="Email" 
              type="email"
              placeholder="you@example.com"
              leftIcon={<EmailIcon />}
              containerClassName="md:col-span-2"
            />
          </div>
        </section>

        {/* Design Specs Reference */}
        <section className="bg-white p-6 rounded-xl border border-border shadow-soft">
          <h2 className="text-2xl font-bold mb-4 text-text-primary">Design Specifications</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong>Background:</strong> White (#FFFFFF)</p>
            <p><strong>Border:</strong> rgba(148, 163, 184, 0.12)</p>
            <p><strong>Border Radius:</strong> 8px</p>
            <p><strong>Padding:</strong> 10px 16px</p>
            <p><strong>Focus Border:</strong> #E5A00D (Plex Yellow)</p>
            <p><strong>Focus Ring:</strong> rgba(229, 160, 13, 0.1) with 3px width</p>
            <p><strong>Font Size:</strong> 14px</p>
            <p><strong>Label:</strong> 14px, font-weight 500, color #0F172A</p>
            <p><strong>Hint:</strong> 12px, color #64748B</p>
            <p><strong>Error Border:</strong> Red (#EF4444)</p>
          </div>
        </section>
      </div>
    </div>
  );
}
