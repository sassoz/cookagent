import { RecipeDetail } from '@/components/recipe-detail';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  return <RecipeDetail id={id} />;
}
