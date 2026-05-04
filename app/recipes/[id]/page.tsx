interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Recipe {id}</h1>
      <p className="text-sm text-gray-700 sm:text-base">Recipe detail scaffold for viewing and future editing.</p>
    </section>
  );
}
