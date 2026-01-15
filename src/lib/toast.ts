import { ExternalToast, toast as sonnerToast } from "sonner";

let lastToastId: string | number | undefined;

const smartDismiss = (data?: ExternalToast) => {
  if (data?.id && data.id === lastToastId) {
    return;
  }
  sonnerToast.dismiss();
};

const trackId = (id: string | number, data?: ExternalToast) => {
  lastToastId = data?.id || id;
  return id;
};

export const toast = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast(message, data);
  return trackId(id, data);
};

toast.success = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast.success(message, data);
  return trackId(id, data);
};

toast.error = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast.error(message, data);
  return trackId(id, data);
};

toast.warning = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast.warning(message, data);
  return trackId(id, data);
};

toast.info = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast.info(message, data);
  return trackId(id, data);
};

toast.loading = (message: string | React.ReactNode, data?: ExternalToast) => {
  smartDismiss(data);
  const id = sonnerToast.loading(message, data);
  return trackId(id, data);
};

toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;
