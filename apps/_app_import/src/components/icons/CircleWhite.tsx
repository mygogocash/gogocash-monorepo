const CircleWhite = ({
  fill = "white",
  width = "216",
  height = "51",
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 216 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M174.215 0.5H40.715L35.715 9.5L31.215 19L26.715 27L22.715 34L20.215 37.5L10.715 45L0.214966 50H8.71497H215.215L207.715 47L199.215 41L192.715 34L188.715 27L184.215 19L178.715 9.5L174.215 0.5Z"
        fill={fill}
      />
      <path
        d="M8.71497 50H0.214966M0.214966 50H215.215L207.715 47L199.215 41L192.715 34L188.715 27L184.215 19L178.715 9.5L174.215 0.5H40.715L35.715 9.5L31.215 19L26.715 27L22.715 34L20.215 37.5L10.715 45L0.214966 50Z"
        stroke={fill}
      />
    </svg>
  );
};

export default CircleWhite;
