const SearchTable = ({
  onSearchChange,
}: {
  onSearchChange?: (value: string) => void;
}) => {
  return (
    <input
      type="text"
      placeholder="Search or type command..."
      onChange={(e) => onSearchChange?.(e.target.value)}
      className="dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pr-5 pl-5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[430px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
    />
  );
};

export default SearchTable;
