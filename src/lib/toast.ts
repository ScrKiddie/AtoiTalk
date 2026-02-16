import { ExternalToast, toast as sonnerToast } from "sonner";

const generateId = () => Date.now().toString();

const dismissAll = () => sonnerToast.dismiss();

export const toast = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.success = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.success(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.error = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.error(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.warning = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.warning(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.info = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.info(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.loading = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.loading(message, { id: generateId(), onDismiss: dismissAll, ...data });
};

toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;
