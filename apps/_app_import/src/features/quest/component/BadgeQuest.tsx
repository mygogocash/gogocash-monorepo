import React from "react";

interface BadgeQuestProps {
  // Define any props if needed
  theme: string;
  title: string;
  icon: string | React.ReactNode;
}
const BadgeQuest = ({ theme, title, icon }: BadgeQuestProps) => {
  return (
    <div className={`${theme} flex items-center gap-2 px-1 py-1 rounded-full w-fit`}>
      {title}
      {icon}
    </div>
  );
};

export default BadgeQuest;
