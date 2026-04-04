const CircleWhite2 = ({
  fill = "white",
  stroke = "white",
  width = "97",
  height = "26",
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 97 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.38278 23L1.88278 25H95.3828L91.8828 22.5L89.3828 20L87.3828 17L85.8828 14L84.8828 11.5L83.8828 8.5L83.3828 5.5L82.5 0.5H77H70H59.5H49H36.5H27H12.8828L12.2125 5.5L11.3828 10.5L10.3828 15L8.88278 19L7.38278 21L5.38278 23Z"
        fill={fill}
        stroke={stroke}
      />

      {/* <path
        d="M10.7974 81.8714L1.88506 86.9571H239.973L231.06 80.6L224.694 74.2429L219.602 66.6143L215.782 58.9857L213.236 52.6286L210.689 45L209.416 37.3714L208.556 30.2196H148.091L124.091 27.7286L121.091 14.0089L113.591 0.5H93.0908L85.0908 14.0089L74.5908 30.2196L28.1886 37.3714L26.0758 50.0857L23.5294 61.5286L19.7098 71.7L15.8902 76.7857L10.7974 81.8714Z"
        fill={fill}
        stroke={stroke}
      /> */}
    </svg>
  );
};

export default CircleWhite2;
