import { RecipeDashboard } from '@/components/recipe-dashboard';

export default function HomePage() {
  return (
    <RecipeDashboard
      heading="Recipe dashboard"
      intro="Browse locally stored recipes, check what is in rotation, and filter quickly from a phone in the kitchen."
    />
  );
}
