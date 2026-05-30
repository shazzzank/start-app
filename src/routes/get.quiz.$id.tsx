import { getUserFn } from '@/app/api-helper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/get/quiz/$id')({
  loader: async ({ params }) => await getUserFn({ data: { id: params.id } }),
  component: () => {
    const quiz = Route.useLoaderData();
    return (
      <div>Quiz detail page</div>
    );
  },
});
