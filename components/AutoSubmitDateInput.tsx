'use client';

export function AutoSubmitDateInput({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue: string;
  className?: string;
}) {
  return (
    <input
      type="date"
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    />
  );
}
