type Props = {
  children: React.ReactNode;
};

export function PostTitle({ children }: Props) {
  return (
    <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 md:text-6xl">
      {children}
    </h1>
  );
}
