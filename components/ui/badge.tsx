import * as React from "react";

type BadgeVariant = "default" | "outline" | "subtle";

function Badge({
  className: _className,
  variant: _variant,
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  void _className;
  void _variant;
  return <span {...props} />;
}

export { Badge };
