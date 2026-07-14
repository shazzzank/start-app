import { getEntityFn } from '@/app/api-helper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/get/$entity/$id')({
  loader: async ({ params }) => await getEntityFn({ data: { entity: params.entity, id: params.id } }),
  component: () => {
    const entity = Route.useLoaderData();

    return (
      <div>{entity} detail page</div>
    );
  },
});
