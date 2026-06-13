import Image from "next/image";

interface IProp {
  handleLogin: () => void;
  icon?: string;
  text: string;
}

const ButtonLogin = ({ handleLogin, icon, text }: IProp) => {
  return (
    <button
      onClick={handleLogin}
      className="group gc-soft-panel flex h-16 w-full items-center gap-4 rounded-[22px] px-4 text-left transition duration-200 hover:-translate-y-0.5"
    >
      {icon && (
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_10px_24px_rgba(16,34,23,0.08)]">
          <Image
            src={icon}
            alt="Login Icon"
            width={22}
            height={22}
            unoptimized={icon.endsWith(".svg")}
          />
        </span>
      )}

      <div>
        <p className="text-[15px] font-semibold text-[#102217]">{text}</p>
        <p className="text-[13px] text-[#5B6B61]">Secure social sign in with one tap</p>
      </div>
    </button>
  );
};

export default ButtonLogin;
