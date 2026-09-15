import clsx from "clsx";

const AnimationMode = {
  ThreeTimes: "animate-beat-3",
  Infinite: "animate-beat",
} as const;

export const PulseIcon = ({
  mode = "ThreeTimes",
}: {
  mode?: keyof typeof AnimationMode;
}) => {
  return (
    <i
      className={clsx(
        `w-1.75 h-1.75 rounded-[50%] bg-live block}`,
        AnimationMode[mode],
      )}
    ></i>
  );
};
