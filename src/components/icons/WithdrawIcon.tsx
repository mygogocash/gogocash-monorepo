const WithdrawIcon = ({
  stroke = "#E6F7ED",
  width = "29",
  height = "29",
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 29 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17 1.26667C16.1378 1.09067 15.2489 1.00178 14.3333 1C6.96933 1 1 6.96933 1 14.3333C1 21.6973 6.96933 27.6667 14.3333 27.6667C21.6973 27.6667 27.6667 21.6973 27.6667 14.3333C27.6649 13.4178 27.576 12.5289 27.4 11.6667"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.3346 10.3332C12.8613 10.3332 11.668 11.2292 11.668 12.3332C11.668 13.4372 12.8613 14.3332 14.3346 14.3332C15.808 14.3332 17.0013 15.2292 17.0013 16.3332C17.0013 17.4372 15.808 18.3332 14.3346 18.3332M14.3346 10.3332C15.4946 10.3332 16.484 10.8892 16.8493 11.6666M14.3346 10.3332V8.99991M14.3346 18.3332C13.1746 18.3332 12.1853 17.7772 11.82 16.9999M14.3346 18.3332V19.6666M20.9986 7.66924L26.5666 2.09857M27.6653 6.97324L27.508 2.85324C27.508 1.88124 26.928 1.27591 25.8706 1.19991L21.7053 1.00391"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export default WithdrawIcon;
