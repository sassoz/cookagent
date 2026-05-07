import { RecipePrintView } from '@/components/recipe-print-view';

interface RecipePrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePrintPage({ params }: RecipePrintPageProps) {
  const { id } = await params;
  return <RecipePrintView id={id} />;
}
