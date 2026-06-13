import type { SVGProps } from "react";

/** Missing orders / search order icon (profile popper). */
const ProfilePopperMissingOrdersIcon = ({
  stroke = "#00AA80",
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18.1905 14.9407L19.3382 20.4753C19.3617 20.7044 19.3406 20.9363 19.276 21.1558C19.2115 21.3753 19.105 21.5774 18.9637 21.7488C18.822 21.92 18.6486 22.0565 18.455 22.1494C18.2614 22.2422 18.0519 22.2893 17.8404 22.2876H3.22198C3.01045 22.2893 2.80098 22.2422 2.60736 22.1494C2.41374 22.0565 2.24036 21.92 2.09864 21.7488C1.9573 21.5774 1.85085 21.3753 1.78631 21.1558C1.72178 20.9363 1.7006 20.7044 1.72419 20.4753L3.04224 7.59375H11.5323"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.69141 7.58849V5.38441C6.69141 4.41014 7.07843 3.47578 7.76734 2.78687C8.45625 2.09796 9.39061 1.71094 10.3649 1.71094C11.3391 1.71094 12.2735 2.09796 12.9624 2.78687C13.6513 3.47578 14.2055 4.64971 14.2055 6.1191"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.9394 14.9413C17.374 14.9413 19.3476 12.9677 19.3476 10.5332C19.3476 8.0986 17.374 6.125 14.9394 6.125C12.5049 6.125 10.5312 8.0986 10.5312 10.5332C10.5312 12.9677 12.5049 14.9413 14.9394 14.9413Z"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.6133 13.4688L22.2868 16.4075"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ProfilePopperMissingOrdersIcon;
