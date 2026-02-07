import { Spinner } from "@/components/ui/spinner";

export const ChatLoading = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-sidebar">
      <Spinner className="h-10 w-10 text-primary" />
    </div>
  );
};
