interface IProp {
  title: string;
  children?: React.ReactNode;
  className?: string;
  desc?: string;
}
const Card = ({ title, children, className = "", desc = "" }: IProp) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
      </div>
      {children && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};

export default Card;
