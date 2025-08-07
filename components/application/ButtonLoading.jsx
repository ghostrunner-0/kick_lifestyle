import React from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {cn} from "@/lib/utils"
const ButtonLoading = ({
  text,
  type,
  loading,
  className,
  onClick,
  ...props
}) => {
  return (
    <Button
      size="sm"
      type={type}
      disabled={loading}
      onClick={onClick}
      className={cn(",",className)}
      {...props}
    >
      {loading && <Loader2Icon className="animate-spin" />}
      {text}
    </Button>
  );
};

export default ButtonLoading;
