import { SchemaType } from "@/app/types";
import { toTitleCase } from "@/app/helper";

export default function Form({ schema, onSubmit }: {
  schema: SchemaType[],
  onSubmit: () => void;
}) {
  return (
    <div className="column">
      {schema.map((item) => {
        const commonProps = {
          name: item.name,
          className: 'form-element page-text',
          defaultValue: typeof item.value === "boolean" ? String(item.value) : (item.value ?? ""),
        };
        switch (item.element) {
          case "input":
            return (
              <div
                className='row'
                key={item.name}
              >
                <input
                  {...commonProps}
                  type={item.type ?? 'text'}
                  placeholder={toTitleCase(item.name)}
                />
                {item.type === 'checkbox' && (
                  <label htmlFor={item.name}>{toTitleCase(item.name)}</label>
                )}
              </div>
            );
          case "select":
            return (
              <select
                key={item.name}
                {...commonProps}
              >
                {item.options?.length && item.options?.map((item, idx) => (
                  <option key={idx} value={(item.value).toString()}>
                    {toTitleCase(item.label)}
                  </option>
                ))}
              </select>
            );
          case "button":
            return (
              <button
                key={item.name}
                type="button"
                name={item.name}
                className="button page-text"
                onSubmit={onSubmit}
              >
                {item.value ?? toTitleCase(item.name)}
              </button>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
