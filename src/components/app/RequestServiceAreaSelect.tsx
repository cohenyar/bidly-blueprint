import { forwardRef } from "react";

export type RequestServiceAreaOption = {
  id: string;
  name_he: string;
  is_active: boolean;
};

export const RequestServiceAreaSelect = forwardRef<
  HTMLSelectElement,
  {
    areas: RequestServiceAreaOption[];
    isPending: boolean;
    isError: boolean;
    value: string;
    invalid?: boolean;
    className?: string;
    onChange: (value: string) => void;
    onRetry: () => void;
  }
>(function RequestServiceAreaSelect(
  { areas, isPending, isError, value, invalid, className, onChange, onRetry },
  ref,
) {
  if (isPending) {
    return (
      <p role="status" className="mt-2 text-[12px] text-muted-foreground">
        טוען אזורי שירות...
      </p>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="mt-2 text-[12px] text-danger">
        <p>לא הצלחנו לטעון את אזורי השירות</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 font-semibold underline underline-offset-2"
        >
          נסו שוב
        </button>
      </div>
    );
  }

  const activeAreas = areas.filter((area) => area.is_active);

  return (
    <>
      <select
        ref={ref}
        className={className}
        value={value}
        aria-invalid={invalid}
        disabled={activeAreas.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">בחירת אזור מנוהל</option>
        {activeAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name_he}
          </option>
        ))}
      </select>
      {activeAreas.length === 0 ? (
        <p role="status" className="mt-2 text-[12px] text-muted-foreground">
          לא הוגדרו אזורי שירות פעילים במערכת
        </p>
      ) : null}
    </>
  );
});
