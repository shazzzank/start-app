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
          className: 'form-element',
          defaultValue: typeof item.value === "boolean" ? String(item.value) : (item.value ?? ""),
        };
        switch (item.element) {
          case "input":
            return (
              <div
                className='column gap-1'
                key={item.name}
              >
                {item.type !== 'checkbox' && (
                  <label htmlFor={item.name} className='font-secondary text-xs tracking-[0.14em] uppercase text-muted'>
                    {toTitleCase(item.name)}
                  </label>
                )}
                <div className='row'>
                  <input
                    {...commonProps}
                    id={item.name}
                    type={item.type ?? 'text'}
                    placeholder={item.type === 'checkbox' ? undefined : toTitleCase(item.name)}
                  />
                  {item.type === 'checkbox' && (
                    <label htmlFor={item.name}>{toTitleCase(item.name)}</label>
                  )}
                </div>
              </div>
            );
          case "select":
            return (
              <div className='column gap-1' key={item.name}>
                <label htmlFor={item.name} className='font-secondary text-xs tracking-[0.14em] uppercase text-muted'>
                  {toTitleCase(item.name)}
                </label>
                <select
                  id={item.name}
                  {...commonProps}
                >
                  {item.options?.length && item.options?.map((item, idx) => (
                    <option key={idx} value={(item.value).toString()}>
                      {toTitleCase(item.label)}
                    </option>
                  ))}
                </select>
              </div>
            );
          case "button":
            return (
              <button
                key={item.name}
                type="button"
                name={item.name}
                className="button"
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
