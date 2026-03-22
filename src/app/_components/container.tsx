type Props = {
  children?: React.ReactNode;
};

const Container = ({ children }: Props) => {
  return <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">{children}</div>;
};

export default Container;
