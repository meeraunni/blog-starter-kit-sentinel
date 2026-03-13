type Props = {
  name?: string;
  picture?: string;
};

export default function Avatar({ name }: Props) {
  const displayName = name?.trim() || "Sentinel Identity";

  return (
    <div className="flex items-center">
      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white text-sm font-semibold">
        SI
      </div>
      <div className="text-sm font-medium">{displayName}</div>
    </div>
  );
}
