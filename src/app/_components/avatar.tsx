type Props = {
  name?: string;
  picture?: string;
};

export default function Avatar({ name }: Props) {
  const displayName = name?.trim() || "Sentinel Identity";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-xs font-semibold tracking-[0.22em] text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
        SI
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-950">{displayName}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Editorial Team</div>
      </div>
    </div>
  );
}
