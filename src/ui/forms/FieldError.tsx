type FieldErrorProps = {
  id?: string;
  message?: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm leading-5 text-red-700" role="alert">
      {message}
    </p>
  );
}
