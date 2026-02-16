import { ExternalToast, toast as sonnerToast } from "sonner";

const generateId = () => Date.now().toString();

export const toast = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast(message, { id: generateId(), ...data });
};

toast.success = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.success(message, { id: generateId(), ...data });
};

toast.error = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.error(message, { id: generateId(), ...data });
};

toast.warning = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.warning(message, { id: generateId(), ...data });
};

toast.info = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.info(message, { id: generateId(), ...data });
};

toast.loading = (message: string | React.ReactNode, data?: ExternalToast) => {
  return sonnerToast.loading(message, { id: generateId(), ...data });
};

toast.dismiss = sonnerToast.dismiss;
toast.promise = sonnerToast.promise;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;
