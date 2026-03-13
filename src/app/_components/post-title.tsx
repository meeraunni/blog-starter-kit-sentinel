type Props = {
  children: React.ReactNode;
};

export function PostTitle({ children }: Props) {
  return (
    <h1 className="mb-8 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
      {children}
    </h1>
  );
}
