import { RecipeEditor } from '@/components/recipe-editor';

interface RecipeEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeEditPage({ params }: RecipeEditPageProps) {
  const { id } = await params;

  return <RecipeEditor id={id} />;
}
