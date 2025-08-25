import React from "react";
import loadingImg from "@/public/assets/images/loading.svg";
import Image from "next/image";

const Loading = () => {
  return (
    <div className="h-screen w-screen flex items-center justify-center animate-pulse">
      <Image
        src={loadingImg}
        width={80}
        height={80}
        alt="Loading..."
        className="opacity-80"
      />
    </div>
  );
};

export default Loading;
