const PromotionIcon = ({
  fill = "#00B14F",
  width = "16",
  height = "16",
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <path
      d="M3.25 2.75h3.09L12.5 8.91a1.06 1.06 0 010 1.5l-2.09 2.09a1.06 1.06 0 01-1.5 0L3.25 5.84V2.75z"
      stroke={fill}
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
    <path
      d="M3.25 2.75L2 4M5.5 5.5l1.25-1.25"
      stroke={fill}
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <circle cx="4.35" cy="4.35" r="0.9" fill={fill} />
  </svg>
);

export default PromotionIcon;
