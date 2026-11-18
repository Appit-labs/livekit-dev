import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--color-surface-container-lowest)] group-[.toaster]:text-[var(--color-on-surface)] group-[.toaster]:shadow-ambient",
          description: "group-[.toast]:text-[var(--color-on-surface-variant)]",
          actionButton: "group-[.toast]:bg-[var(--color-primary)] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[var(--color-surface-container)] group-[.toast]:text-[var(--color-on-surface-variant)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
