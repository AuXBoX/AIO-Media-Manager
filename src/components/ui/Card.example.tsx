import { Card, CardHeader, CardContent, CardFooter } from './Card';
import { Button } from './Button';

/**
 * Card Component Examples
 * 
 * This file demonstrates various usage patterns for the Card component
 * following the Plex Pro design system.
 */

// Example 1: Basic Card with Content Only
export function BasicCard() {
  return (
    <Card>
      <CardContent>
        <p className="text-slate-700">
          This is a simple card with just content. Perfect for displaying
          information without headers or actions.
        </p>
      </CardContent>
    </Card>
  );
}

// Example 2: Card with Header and Content
export function CardWithHeader() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Card Title</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700">
          Edit
        </button>
      </CardHeader>
      <CardContent>
        <p className="text-slate-700">
          This card has a header with a title and action button, plus content below.
        </p>
      </CardContent>
    </Card>
  );
}

// Example 3: Complete Card with All Sections
export function CompleteCard() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Metadata</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700">
          Refresh
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <p className="text-slate-900">The Matrix</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Year</label>
            <p className="text-slate-900">1999</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Rating</label>
            <p className="text-slate-900">R</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="medium">
          Cancel
        </Button>
        <Button variant="primary" size="medium">
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

// Example 4: Non-Hoverable Card
export function StaticCard() {
  return (
    <Card hoverable={false}>
      <CardContent>
        <p className="text-slate-700">
          This card doesn't have hover effects. Useful for static information
          displays where interaction isn't expected.
        </p>
      </CardContent>
    </Card>
  );
}

// Example 5: Card with Custom Styling
export function CustomStyledCard() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="bg-primary-50">
        <h3 className="text-lg font-semibold text-primary-900">Custom Styled</h3>
      </CardHeader>
      <CardContent className="bg-gradient-to-b from-primary-50 to-white">
        <p className="text-slate-700">
          You can add custom classes to any card section to override or extend
          the default styling.
        </p>
      </CardContent>
    </Card>
  );
}

// Example 6: Card Grid Layout
export function CardGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Movies</h3>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary-600">1,234</p>
          <p className="text-sm text-slate-600">Total items</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">TV Shows</h3>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary-600">567</p>
          <p className="text-sm text-slate-600">Total items</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Music</h3>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary-600">8,901</p>
          <p className="text-sm text-slate-600">Total tracks</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Example 7: Card with Form
export function FormCard() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Edit Details</h3>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter title..."
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter description..."
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save</Button>
      </CardFooter>
    </Card>
  );
}

// Example 8: Card with List
export function ListCard() {
  const items = [
    { id: 1, name: 'Item 1', status: 'Active' },
    { id: 2, name: 'Item 2', status: 'Pending' },
    { id: 3, name: 'Item 3', status: 'Completed' },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Recent Items</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700">
          View All
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-200">
          {items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-900">{item.name}</span>
                <span className="text-sm text-slate-600">{item.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Example 9: Nested Cards
export function NestedCards() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Library Overview</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Card hoverable={false} className="shadow-sm">
            <CardContent>
              <h4 className="font-medium text-slate-900 mb-2">Movies</h4>
              <p className="text-sm text-slate-600">1,234 items • 2.5 TB</p>
            </CardContent>
          </Card>
          <Card hoverable={false} className="shadow-sm">
            <CardContent>
              <h4 className="font-medium text-slate-900 mb-2">TV Shows</h4>
              <p className="text-sm text-slate-600">567 items • 1.8 TB</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

// Example 10: Card with Image
export function ImageCard() {
  return (
    <Card className="max-w-sm">
      <div className="aspect-video bg-slate-200 rounded-t-xl overflow-hidden">
        <img
          src="https://via.placeholder.com/400x225"
          alt="Placeholder"
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Featured Content
        </h3>
        <p className="text-sm text-slate-600">
          This card includes an image at the top with content below.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" className="w-full">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
