import { SchemaType } from "@/app/types";
import { toTitleCase } from "@/app/helper";
import Button from "@/app/components/button";

export default function Form({ schema, onSubmit }: {
  schema: SchemaType[],
  onSubmit: () => void;
}) {
  return (
    <div className="column">
      {schema.map((item) => {
        const commonProps = {
          name: item.name,
          className: 'field',
          defaultValue: typeof item.value === "boolean" ? String(item.value) : (item.value ?? ""),
        };
        switch (item.element) {
          case "input":
            return (
              <div className='column gap-1' key={item.name}>
                {item.type !== 'checkbox' && (
                  <label htmlFor={item.name} className='label'>{toTitleCase(item.name)}</label>
                )}
                <div className='row'>
                  <input {...commonProps} id={item.name} type={item.type ?? 'text'} aria-required={item.type !== 'checkbox'} />
                  {item.type === 'checkbox' && <label htmlFor={item.name}>{toTitleCase(item.name)}</label>}
                </div>
              </div>
            );
          case "select":
            return (
              <div className='column gap-1' key={item.name}>
                <label htmlFor={item.name} className='label'>{toTitleCase(item.name)}</label>
                <select id={item.name} {...commonProps} aria-required='true'>
                  {item.options?.map((option, idx) => (
                    <option key={idx} value={String(option.value)}>{toTitleCase(option.label)}</option>
                  ))}
                </select>
              </div>
            );
          case "radio":
            return (
              <fieldset className='radio' key={item.name}>
                <legend className='label'>{toTitleCase(item.name)}</legend>
                <div className='radio-row'>
                  {item.options?.map((option) => {
                    const value = String(option.value);
                    return (
                      <label key={value} className='radio-opt'>
                        <input
                          type='radio'
                          name={item.name}
                          value={value}
                          defaultChecked={String(item.value) === value}
                          className='radio-in'
                        />
                        <span className='radio-dot' aria-hidden='true' />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          case "button":
            return <Button key={item.name} onClick={onSubmit}>{item.value ?? toTitleCase(item.name)}</Button>;
          default:
            return null;
        }
      })}
    </div>
  );
}
