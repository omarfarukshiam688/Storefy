import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

const AuthCard = React.forwardRef<HTMLDivElement, AuthCardProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full max-w-md animate-slide-up rounded-[22px] border border-violet-100/80 bg-white p-6 shadow-[0_24px_70px_rgba(47,30,87,0.14)] sm:p-9",
          className
        )}
        {...props}
      >
        <div className="mb-7 text-center">
          <Image
            src="/storefy-LOGO.png"
            alt="Storefy"
            width={260}
            height={146}
            priority
            className="mx-auto h-auto w-[260px] max-w-full"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.65rem]">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    );
  }
);
AuthCard.displayName = "AuthCard";

export { AuthCard };
