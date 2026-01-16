import { ExternalToast, toast as sonnerToast } from "sonner";

export const toast = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast(message, data);
};

toast.success = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.success(message, data);
};

toast.error = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.error(message, data);
};

toast.warning = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.warning(message, data);
};

toast.info = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.info(message, data);
};

toast.loading = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.loading(message, data);
};

toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;
