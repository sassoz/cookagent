interface RecipePrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePrintPage({ params }: RecipePrintPageProps) {
  const { id } = await params;

  return (
    <article className="mx-auto max-w-2xl space-y-4 bg-white p-6 shadow-sm print:shadow-none">
      <h1 className="text-2xl font-semibold">Printable Recipe {id}</h1>
      <p className="text-sm text-gray-700">Print-friendly recipe view scaffold.</p>
    </article>
  );
}
