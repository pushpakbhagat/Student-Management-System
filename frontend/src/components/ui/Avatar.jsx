import { useState } from "react";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";
import { toneFor } from "../../lib/palette";

const SIZES = {
  sm: "w-9 h-9 text-[12px]",
  md: "w-11 h-11 text-[14px]",
  lg: "w-16 h-16 text-[20px]",
  xl: "w-20 h-20 text-[24px]",
};

// Photo if the person has a working one, otherwise colourful initials
export default function Avatar({ person, size = "md", className }) {
  const [broken, setBroken] = useState(false);
  const showImage = person?.imgURL && !broken;
  const tone = toneFor(person?.email || `${person?.firstName}${person?.lastName}`);

  return (
    <div
      className={cn(
        "rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-white",
        "bg-linear-to-br shadow-soft ring-2 ring-white",
        tone.gradient,
        SIZES[size],
        className
      )}
    >
      {showImage ? (
        <img src={person.imgURL} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden="true">{initials(person) || "?"}</span>
      )}
    </div>
  );
}
