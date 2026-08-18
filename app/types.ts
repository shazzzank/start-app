import { entityConfig } from "@/app/db-schema";
import z from "zod";

export type TostType = {
  toast: any;
  setToast: any;
};
export type SchemaType = {
  name: string;
  value: string | number | boolean | null | undefined;
  element: 'select' | 'input' | 'button';
  type: 'text' | 'email' | 'tel' | 'date' | 'checkbox' | null;
  options?: { label: string; value: string | number | boolean }[];
};
export type UserSelectType = z.infer<typeof entityConfig.user.selectValidator>;
