/** A tiny empty grid while a page arrives. */
export default function Loading() {
  return (
    <div className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3" aria-busy>
      <div className="grid grid-cols-3 gap-0.5 rounded-lg border-2 border-line bg-cell-line p-0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`size-7 rounded-[2px] ${i === 4 ? "bg-cell-block" : "bg-cell"}`}
          />
        ))}
      </div>
      <span aria-hidden className="flex gap-1.5">
        <span className="block size-2 rotate-45 bg-pink" />
        <span className="block size-2 rotate-45 bg-butter" />
        <span className="block size-2 rotate-45 bg-mint" />
      </span>
    </div>
  );
}
