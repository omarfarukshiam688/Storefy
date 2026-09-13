import * as React from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

const AuthCard = React.forwardRef<HTMLDivElement, AuthCardProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    );
  }
);
AuthCard.displayName = "AuthCard";

export { AuthCard };
