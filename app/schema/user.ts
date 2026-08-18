import { getTableColumns } from "drizzle-orm";
import { SchemaType, UserSelectType } from "@/app/types";
import { dbUserSchema } from "@/app/db-schema";

export default function userSchema(data: UserSelectType | null): SchemaType[] {
  return [
    ...Object.entries(getTableColumns(dbUserSchema))
      .filter(([key]) => key !== 'created_at' && key !== 'id')
      .map(([key, column]): SchemaType => ({
        name: key,
        value: data?.[key as keyof UserSelectType],
        element: column.enumValues?.length ? 'select' : 'input',
        type: column.dataType === 'boolean' ? 'checkbox' : 'text',
        options: column.enumValues?.map((value: string) => ({
          label: value,
          value,
        })),
      })),
    {
      name: 'submit',
      value: 'Submit',
      element: 'button' as const,
      type: null,
    },
  ];
}
